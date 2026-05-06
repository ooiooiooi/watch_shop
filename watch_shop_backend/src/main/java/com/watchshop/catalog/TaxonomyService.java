package com.watchshop.catalog;

import com.watchshop.catalog.dto.TaxonomyDtos.BrandDto;
import com.watchshop.catalog.dto.TaxonomyDtos.ModelDto;
import com.watchshop.common.ApiException;
import jakarta.transaction.Transactional;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class TaxonomyService {
  private final BrandRepository brandRepository;
  private final WatchModelRepository watchModelRepository;
  private final ProductRepository productRepository;
  private final SeedData seedData;

  public TaxonomyService(BrandRepository brandRepository, WatchModelRepository watchModelRepository, ProductRepository productRepository, SeedData seedData) {
    this.brandRepository = brandRepository;
    this.watchModelRepository = watchModelRepository;
    this.productRepository = productRepository;
    this.seedData = seedData;
  }

  public List<BrandDto> listBrands() {
    return brandRepository.findAll().stream()
        .sorted(Comparator.comparing(BrandEntity::getName))
        .map(TaxonomyService::toDto)
        .toList();
  }

  public List<ModelDto> listModels(Optional<String> brandId) {
    if (brandId.isPresent() && !brandId.get().isBlank()) {
      return watchModelRepository.findByBrandIdOrderByNameAsc(brandId.get()).stream().map(TaxonomyService::toDto).toList();
    }
    return watchModelRepository.findAll().stream()
        .sorted(Comparator.comparing(WatchModelEntity::getBrandId).thenComparing(WatchModelEntity::getName))
        .map(TaxonomyService::toDto)
        .toList();
  }

  @Transactional
  public BrandDto createBrand(BrandDto dto) {
    String id = dto.id().trim();
    String name = dto.name().trim();
    if (id.equalsIgnoreCase("all")) throw new ApiException(HttpStatus.BAD_REQUEST, "品牌ID不能为 all");
    if (brandRepository.existsById(id)) throw new ApiException(HttpStatus.CONFLICT, "品牌ID已存在");
    ensureBrandNameUnique(name, null);
    BrandEntity e = new BrandEntity();
    e.setId(id);
    e.setName(name);
    e.setImage(dto.image());
    return toDto(brandRepository.save(e));
  }

  @Transactional
  public BrandDto updateBrand(String id, BrandDto dto) {
    if (!Objects.equals(id, dto.id())) throw new ApiException(HttpStatus.BAD_REQUEST, "路径ID与请求体ID不一致");
    if (id.equalsIgnoreCase("all")) throw new ApiException(HttpStatus.BAD_REQUEST, "品牌ID不能为 all");
    String name = dto.name().trim();
    ensureBrandNameUnique(name, id);
    BrandEntity e = brandRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "品牌不存在"));
    e.setName(name);
    e.setImage(dto.image());
    return toDto(brandRepository.save(e));
  }

  @Transactional
  public void deleteBrand(String id) {
    if (!brandRepository.existsById(id)) throw new ApiException(HttpStatus.NOT_FOUND, "品牌不存在");
    boolean hasModel = watchModelRepository.findByBrandIdOrderByNameAsc(id).size() > 0;
    if (hasModel) throw new ApiException(HttpStatus.CONFLICT, "该品牌下仍有型号，无法删除");
    boolean usedByProduct = productRepository.count((root, query, cb) -> cb.or(
        cb.equal(root.get("brandId"), id),
        cb.equal(root.get("brand"), brandNameForId(id))
    )) > 0;
    if (usedByProduct) throw new ApiException(HttpStatus.CONFLICT, "该品牌仍有商品在使用，无法删除");
    brandRepository.deleteById(id);
  }

  @Transactional
  public ModelDto createModel(ModelDto dto) {
    String id = dto.id().trim();
    String brandId = dto.brandId().trim();
    String name = dto.name().trim();
    if (id.equalsIgnoreCase("all")) throw new ApiException(HttpStatus.BAD_REQUEST, "型号ID不能为 all");
    if (watchModelRepository.existsById(id)) throw new ApiException(HttpStatus.CONFLICT, "型号ID已存在");
    if (!brandRepository.existsById(brandId)) throw new ApiException(HttpStatus.BAD_REQUEST, "品牌不存在");
    ensureModelNameUnique(brandId, name, null);
    WatchModelEntity e = new WatchModelEntity();
    e.setId(id);
    e.setBrandId(brandId);
    e.setName(name);
    e.setImage(dto.image());
    return toDto(watchModelRepository.save(e));
  }

  @Transactional
  public ModelDto updateModel(String id, ModelDto dto) {
    if (!Objects.equals(id, dto.id())) throw new ApiException(HttpStatus.BAD_REQUEST, "路径ID与请求体ID不一致");
    if (id.equalsIgnoreCase("all")) throw new ApiException(HttpStatus.BAD_REQUEST, "型号ID不能为 all");
    String brandId = dto.brandId().trim();
    String name = dto.name().trim();
    if (!brandRepository.existsById(brandId)) throw new ApiException(HttpStatus.BAD_REQUEST, "品牌不存在");
    ensureModelNameUnique(brandId, name, id);
    WatchModelEntity e = watchModelRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "型号不存在"));
    e.setBrandId(brandId);
    e.setName(name);
    e.setImage(dto.image());
    return toDto(watchModelRepository.save(e));
  }

  @Transactional
  public void deleteModel(String id) {
    WatchModelEntity e = watchModelRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "型号不存在"));
    boolean usedByProduct = productRepository.count((root, query, cb) -> cb.or(
        cb.equal(root.get("modelId"), id),
        cb.equal(root.get("model"), e.getName())
    )) > 0;
    if (usedByProduct) throw new ApiException(HttpStatus.CONFLICT, "该型号仍有商品在使用，无法删除");
    watchModelRepository.deleteById(id);
  }

  @Transactional
  public void ensureSeeded() {
    for (BrandDto seed : seedData.seedBrands()) {
      brandRepository.findById(seed.id()).ifPresentOrElse(existing -> {
        boolean changed = false;
        if ((existing.getName() == null || existing.getName().isBlank()) && seed.name() != null && !seed.name().isBlank()) {
          existing.setName(seed.name());
          changed = true;
        }
        if ((existing.getImage() == null || existing.getImage().isBlank()) && seed.image() != null && !seed.image().isBlank()) {
          existing.setImage(seed.image());
          changed = true;
        }
        if (changed) brandRepository.save(existing);
      }, () -> {
        BrandEntity e = new BrandEntity();
        e.setId(seed.id());
        e.setName(seed.name());
        e.setImage(seed.image());
        brandRepository.save(e);
      });
    }

    for (ModelDto seed : seedData.seedModels()) {
      if (!brandRepository.existsById(seed.brandId())) continue;
      watchModelRepository.findById(seed.id()).ifPresentOrElse(existing -> {
        boolean changed = false;
        if ((existing.getName() == null || existing.getName().isBlank()) && seed.name() != null && !seed.name().isBlank()) {
          existing.setName(seed.name());
          changed = true;
        }
        if ((existing.getImage() == null || existing.getImage().isBlank()) && seed.image() != null && !seed.image().isBlank()) {
          existing.setImage(seed.image());
          changed = true;
        }
        if ((existing.getBrandId() == null || existing.getBrandId().isBlank()) && seed.brandId() != null && !seed.brandId().isBlank()) {
          existing.setBrandId(seed.brandId());
          changed = true;
        }
        if (changed) watchModelRepository.save(existing);
      }, () -> {
        WatchModelEntity e = new WatchModelEntity();
        e.setId(seed.id());
        e.setBrandId(seed.brandId());
        e.setName(seed.name());
        e.setImage(seed.image());
        watchModelRepository.save(e);
      });
    }
  }

  private String brandNameForId(String id) {
    return brandRepository.findById(id).map(BrandEntity::getName).orElse(id);
  }

  private void ensureBrandNameUnique(String name, String currentId) {
    brandRepository.findFirstByNameIgnoreCase(name).ifPresent(existing -> {
      if (currentId == null || !existing.getId().equals(currentId)) {
        throw new ApiException(HttpStatus.CONFLICT, "品牌名称已存在");
      }
    });
  }

  private void ensureModelNameUnique(String brandId, String name, String currentId) {
    watchModelRepository.findFirstByBrandIdAndNameIgnoreCase(brandId, name).ifPresent(existing -> {
      if (currentId == null || !existing.getId().equals(currentId)) {
        throw new ApiException(HttpStatus.CONFLICT, "该品牌下的型号名称已存在");
      }
    });
  }

  private static BrandDto toDto(BrandEntity e) {
    return new BrandDto(e.getId(), e.getName(), e.getImage());
  }

  private static ModelDto toDto(WatchModelEntity e) {
    return new ModelDto(e.getId(), e.getBrandId(), e.getName(), e.getImage());
  }
}
