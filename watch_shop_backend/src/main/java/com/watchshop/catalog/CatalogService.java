package com.watchshop.catalog;

import com.watchshop.catalog.dto.CatalogDtos.CategoryDto;
import com.watchshop.catalog.dto.CatalogDtos.ProductDto;
import com.watchshop.catalog.dto.CatalogDtos.ProductSkuDto;
import com.watchshop.catalog.dto.CatalogDtos.SpecGroupDto;
import com.watchshop.common.ApiException;
import com.watchshop.common.PageResponse;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {
  private final CategoryRepository categoryRepository;
  private final ProductRepository productRepository;
  private final BrandRepository brandRepository;
  private final WatchModelRepository watchModelRepository;
  private final SeedData seedData;

  public CatalogService(
      CategoryRepository categoryRepository,
      ProductRepository productRepository,
      BrandRepository brandRepository,
      WatchModelRepository watchModelRepository,
      SeedData seedData
  ) {
    this.categoryRepository = categoryRepository;
    this.productRepository = productRepository;
    this.brandRepository = brandRepository;
    this.watchModelRepository = watchModelRepository;
    this.seedData = seedData;
  }

  public List<CategoryDto> listCategories() {
    return categoryRepository.findAll().stream()
        .sorted(Comparator.comparing(CategoryEntity::getId))
        .map(CatalogService::toDto)
        .toList();
  }

  public PageResponse<ProductDto> listProductsPage(
      Optional<String> category,
      Optional<String> status,
      Optional<String> brand,
      Optional<String> model,
      Optional<String> brandId,
      Optional<String> modelId,
      Optional<String> q,
      Optional<String> sort,
      int page,
      int size
  ) {
    int safePage = Math.max(0, page);
    int safeSize = Math.min(Math.max(1, size), 100);
    Specification<ProductEntity> spec = buildProductSpec(category, status, brand, model, brandId, modelId, q);
    Sort dbSort = toDbSort(sort);
    Page<ProductEntity> result = productRepository.findAll(spec, PageRequest.of(safePage, safeSize, dbSort));
    List<ProductDto> items = result.getContent().stream().map(CatalogService::toDto).toList();
    return new PageResponse<>(items, result.getTotalElements(), safePage, safeSize);
  }

  public List<ProductDto> listProducts(
      Optional<String> category,
      Optional<String> status,
      Optional<String> brand,
      Optional<String> model,
      Optional<String> brandId,
      Optional<String> modelId,
      Optional<String> q,
      Optional<String> sort
  ) {
    Specification<ProductEntity> spec = buildProductSpec(category, status, brand, model, brandId, modelId, q);
    Sort dbSort = toDbSort(sort);
    return productRepository.findAll(spec, dbSort).stream()
        .map(CatalogService::toDto)
        .toList();
  }

  private static Sort toDbSort(Optional<String> sort) {
    if (sort.isPresent() && !sort.get().isBlank()) {
      String s = sort.get().trim().toLowerCase(Locale.ROOT);
      if (s.equals("price-asc")) return Sort.by(Sort.Direction.ASC, "price").and(Sort.by(Sort.Direction.DESC, "createdAt")).and(Sort.by(Sort.Direction.DESC, "id"));
      if (s.equals("price-desc")) return Sort.by(Sort.Direction.DESC, "price").and(Sort.by(Sort.Direction.DESC, "createdAt")).and(Sort.by(Sort.Direction.DESC, "id"));
    }
    return Sort.by(Sort.Direction.ASC, "sortOrder").and(Sort.by(Sort.Direction.DESC, "createdAt")).and(Sort.by(Sort.Direction.DESC, "id"));
  }

  private static Specification<ProductEntity> buildProductSpec(
      Optional<String> category,
      Optional<String> status,
      Optional<String> brand,
      Optional<String> model,
      Optional<String> brandId,
      Optional<String> modelId,
      Optional<String> q
  ) {
    Specification<ProductEntity> spec = Specification.where(null);
    if (category.isPresent() && !category.get().isBlank()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category.get().trim()));
    }
    if (status.isPresent() && !status.get().isBlank()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status.get().trim()));
    }
    if (brandId.isPresent() && !brandId.get().isBlank()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("brandId"), brandId.get().trim()));
    } else if (brand.isPresent() && !brand.get().isBlank()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("brand"), brand.get().trim()));
    }
    if (modelId.isPresent() && !modelId.get().isBlank()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("modelId"), modelId.get().trim()));
    } else if (model.isPresent() && !model.get().isBlank()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("model"), model.get().trim()));
    }
    if (q.isPresent() && !q.get().isBlank()) {
      String trimmed = q.get().trim();
      String limited = trimmed.length() > 80 ? trimmed.substring(0, 80) : trimmed;
      String like = "%" + limited.toLowerCase(Locale.ROOT) + "%";
      spec = spec.and((root, query, cb) -> cb.or(
          cb.like(cb.lower(root.get("id")), like),
          cb.like(cb.lower(root.get("name")), like),
          cb.like(cb.lower(root.get("brand")), like),
          cb.like(cb.lower(root.get("model")), like),
          cb.like(cb.lower(root.get("brandId")), like),
          cb.like(cb.lower(root.get("modelId")), like),
          cb.like(cb.lower(root.get("reference")), like),
          cb.like(cb.lower(root.get("collection")), like),
          cb.like(cb.lower(root.get("tag")), like)
      ));
    }
    return spec;
  }

  public ProductDto getProduct(String id) {
    ProductEntity entity = productRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "商品不存在"));
    return toDto(entity);
  }

  public List<ProductDto> listRelatedProducts(String id, int limit) {
    if (limit <= 0) return List.of();
    ProductEntity base = productRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "商品不存在"));
    String brandId = base.getBrandId();
    String category = base.getCategory();

    Specification<ProductEntity> spec = (root, query, cb) -> cb.notEqual(root.get("id"), id);
    spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), "on"));

    if (brandId != null && !brandId.isBlank()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("brandId"), brandId));
    } else if (category != null && !category.isBlank()) {
      spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
    }

    return productRepository.findAll(spec, PageRequest.of(0, Math.min(limit, 20), Sort.by(Sort.Direction.ASC, "sortOrder").and(Sort.by(Sort.Direction.DESC, "createdAt")).and(Sort.by(Sort.Direction.DESC, "id")))).stream()
        .map(CatalogService::toDto)
        .toList();
  }

  public List<ProductDto> listProductsByIds(List<String> ids, boolean onOnly) {
    if (ids == null || ids.isEmpty()) return List.of();
    List<ProductEntity> entities = productRepository.findAllById(ids);
    java.util.Map<String, ProductEntity> byId = entities.stream()
        .collect(Collectors.toMap(ProductEntity::getId, it -> it, (a, b) -> a));
    return ids.stream()
        .map(byId::get)
        .filter(Objects::nonNull)
        .filter(it -> !onOnly || "on".equalsIgnoreCase(it.getStatus()))
        .map(CatalogService::toDto)
        .toList();
  }

  @Transactional
  public CategoryDto createCategory(CategoryDto dto) {
    String id = dto.id().trim();
    if (id.equalsIgnoreCase("all")) throw new ApiException(HttpStatus.BAD_REQUEST, "分类ID不能为 all");
    if (categoryRepository.existsById(id)) throw new ApiException(HttpStatus.CONFLICT, "分类ID已存在");
    CategoryEntity entity = new CategoryEntity();
    entity.setId(id);
    entity.setName(dto.name().trim());
    entity.setImage(dto.image().trim());
    return toDto(categoryRepository.save(entity));
  }

  @Transactional
  public CategoryDto updateCategory(String id, CategoryDto dto) {
    if (!Objects.equals(id, dto.id())) throw new ApiException(HttpStatus.BAD_REQUEST, "路径ID与请求体ID不一致");
    if (id.equalsIgnoreCase("all")) throw new ApiException(HttpStatus.BAD_REQUEST, "分类ID不能为 all");
    CategoryEntity entity = categoryRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "分类不存在"));
    entity.setName(dto.name().trim());
    entity.setImage(dto.image().trim());
    return toDto(categoryRepository.save(entity));
  }

  @Transactional
  public void deleteCategory(String id) {
    boolean used = productRepository.count((root, query, cb) -> cb.equal(root.get("category"), id)) > 0;
    if (used) throw new ApiException(HttpStatus.CONFLICT, "该分类下仍有商品，无法删除");
    if (!categoryRepository.existsById(id)) throw new ApiException(HttpStatus.NOT_FOUND, "分类不存在");
    categoryRepository.deleteById(id);
  }

  @Transactional
  public ProductDto createProduct(ProductDto dto) {
    String id = dto.id().trim();
    if (productRepository.existsById(id)) throw new ApiException(HttpStatus.CONFLICT, "商品ID已存在");
    ensureCategoryExists(dto.category());
    ProductDto normalized = resolveTaxonomy(normalize(dto));
    validateProduct(normalized);
    ProductEntity entity = toEntity(normalized);
    return toDto(productRepository.save(entity));
  }

  @Transactional
  public ProductDto updateProduct(String id, ProductDto dto) {
    if (!Objects.equals(id, dto.id())) throw new ApiException(HttpStatus.BAD_REQUEST, "路径ID与请求体ID不一致");
    if (!productRepository.existsById(id)) throw new ApiException(HttpStatus.NOT_FOUND, "商品不存在");
    ensureCategoryExists(dto.category());
    ProductDto normalized = resolveTaxonomy(normalize(dto));
    validateProduct(normalized);
    ProductEntity entity = toEntity(normalized);
    return toDto(productRepository.save(entity));
  }

  @Transactional
  public void deleteProduct(String id) {
    if (!productRepository.existsById(id)) throw new ApiException(HttpStatus.NOT_FOUND, "商品不存在");
    productRepository.deleteById(id);
  }

  @Transactional
  public void resetCatalog() {
    productRepository.deleteAllInBatch();
    categoryRepository.deleteAllInBatch();
    seedData.seedCategories().forEach(this::createCategory);
    seedData.seedProducts().forEach(this::createProduct);
  }

  @Transactional
  public void ensureSeeded() {
    if (categoryRepository.count() == 0 && productRepository.count() == 0) {
      seedData.seedCategories().forEach(this::createCategory);
      seedData.seedProducts().forEach(this::createProduct);
      return;
    }

    for (CategoryDto seedCategory : seedData.seedCategories()) {
      if (!categoryRepository.existsById(seedCategory.id())) {
        createCategory(seedCategory);
      }
    }

    for (ProductDto seed : seedData.seedProducts()) {
      productRepository.findById(seed.id()).ifPresentOrElse(existing -> {
        boolean changed = false;
        if ((existing.getBrandId() == null || existing.getBrandId().isBlank()) && seed.brand() != null && !seed.brand().isBlank()) {
          brandRepository.findFirstByNameIgnoreCase(seed.brand().trim()).ifPresent(b -> {
            existing.setBrandId(b.getId());
            existing.setBrand(b.getName());
          });
          changed = true;
        }
        if ((existing.getModelId() == null || existing.getModelId().isBlank()) && seed.model() != null && !seed.model().isBlank()) {
          String bid = existing.getBrandId();
          if (bid != null && !bid.isBlank()) {
            watchModelRepository.findFirstByBrandIdAndNameIgnoreCase(bid, seed.model().trim()).ifPresent(m -> {
              existing.setModelId(m.getId());
              existing.setModel(m.getName());
            });
            changed = true;
          }
        }
        if ((existing.getReference() == null || existing.getReference().isBlank()) && seed.reference() != null && !seed.reference().isBlank()) {
          existing.setReference(seed.reference());
          changed = true;
        }
        if (changed) productRepository.save(existing);
      }, () -> {
        createProduct(seed);
      });
    }

    backfillTaxonomyIds();
  }

  @Transactional
  public void backfillTaxonomyIds() {
    List<ProductEntity> all = productRepository.findAll();
    for (ProductEntity p : all) {
      boolean changed = false;

      if ((p.getBrandId() == null || p.getBrandId().isBlank()) && p.getBrand() != null && !p.getBrand().isBlank()) {
        brandRepository.findFirstByNameIgnoreCase(p.getBrand().trim()).ifPresent(b -> {
          p.setBrandId(b.getId());
          p.setBrand(b.getName());
        });
        changed = true;
      }

      if ((p.getModelId() == null || p.getModelId().isBlank()) && p.getModel() != null && !p.getModel().isBlank()) {
        String bid = p.getBrandId();
        if (bid != null && !bid.isBlank()) {
          watchModelRepository.findFirstByBrandIdAndNameIgnoreCase(bid, p.getModel().trim()).ifPresent(m -> {
            p.setModelId(m.getId());
            p.setModel(m.getName());
          });
          changed = true;
        }
      }

      if (changed) productRepository.save(p);
    }
  }

  private void ensureCategoryExists(String id) {
    if (!categoryRepository.existsById(id)) throw new ApiException(HttpStatus.BAD_REQUEST, "商品分类不存在");
  }

  private ProductDto resolveTaxonomy(ProductDto p) {
    String brandId = normalizeText(p.brandId());
    String modelId = normalizeText(p.modelId());
    String brandName = normalizeText(p.brand());
    String modelName = normalizeText(p.model());

    BrandEntity brand = null;
    if (brandId != null) {
      brand = brandRepository.findById(brandId).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "品牌不存在"));
      brandName = brand.getName();
    } else if (brandName != null) {
      brand = brandRepository.findFirstByNameIgnoreCase(brandName).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "品牌不存在"));
      brandId = brand.getId();
      brandName = brand.getName();
    }

    WatchModelEntity model = null;
    if (modelId != null) {
      model = watchModelRepository.findById(modelId).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "型号不存在"));
      modelName = model.getName();
      if (brandId == null) {
        brandId = model.getBrandId();
        brand = brandRepository.findById(brandId).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "品牌不存在"));
        brandName = brand.getName();
      } else if (!brandId.equals(model.getBrandId())) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "型号不属于该品牌");
      }
    } else if (modelName != null) {
      if (brandId == null) throw new ApiException(HttpStatus.BAD_REQUEST, "设置型号时必须先选择品牌");
      model = watchModelRepository.findFirstByBrandIdAndNameIgnoreCase(brandId, modelName)
          .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "型号不存在"));
      modelId = model.getId();
      modelName = model.getName();
    }

    return new ProductDto(
        p.id(),
        p.name(),
        brandName,
        modelName,
        p.reference(),
        p.collection(),
        p.price(),
        p.originalPrice(),
        p.image(),
        p.images(),
        p.tag(),
        p.category(),
        p.description(),
        p.status(),
        p.sortOrder(),
        p.metaTitle(),
        p.metaDescription(),
        p.specGroups(),
        p.skus(),
        brandId,
        modelId
    );
  }

  private static void validateProduct(ProductDto p) {
    if (p.id() == null || p.id().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "商品ID不能为空");
    if (p.name() == null || p.name().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "商品名称不能为空");
    if (p.category() == null || p.category().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "商品分类不能为空");
    if (p.collection() == null || p.collection().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "系列不能为空");
    if (p.image() == null || p.image().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "图片URL不能为空");
    if (p.image().length() > 1024) throw new ApiException(HttpStatus.BAD_REQUEST, "图片URL过长");
    String img = p.image().trim().toLowerCase(Locale.ROOT);
    if (!isAllowedImageUrl(img)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "图片URL必须以 http://、https://、/uploads/ 或 /api/uploads/ 开头");
    }
    if (p.images() != null) {
      if (p.images().size() > 20) throw new ApiException(HttpStatus.BAD_REQUEST, "详情图片数量过多");
      for (String u : p.images()) {
        if (u == null) continue;
        String s = u.trim().toLowerCase(Locale.ROOT);
        if (s.isBlank()) continue;
        if (s.length() > 1024) throw new ApiException(HttpStatus.BAD_REQUEST, "详情图片URL过长");
        if (!isAllowedImageUrl(s)) {
          throw new ApiException(HttpStatus.BAD_REQUEST, "详情图片URL必须以 http://、https://、/uploads/ 或 /api/uploads/ 开头");
        }
      }
    }
    if (!Double.isFinite(p.price()) || p.price() < 0) throw new ApiException(HttpStatus.BAD_REQUEST, "价格不合法");
    if (p.originalPrice() != null && (!Double.isFinite(p.originalPrice()) || p.originalPrice() < 0)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "原价不合法");
    }

    String status = p.status() == null ? "" : p.status().trim().toLowerCase(Locale.ROOT);
    if (!(status.equals("on") || status.equals("off"))) throw new ApiException(HttpStatus.BAD_REQUEST, "状态只能为 on 或 off");

    if (p.specGroups() == null || p.specGroups().isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "请至少配置 1 个规格组");
    List<String> groupNames = p.specGroups().stream().map(SpecGroupDto::name).toList();
    if (groupNames.stream().anyMatch(n -> n == null || n.isBlank())) throw new ApiException(HttpStatus.BAD_REQUEST, "规格组名称不能为空");
    if (groupNames.size() != groupNames.stream().distinct().count()) throw new ApiException(HttpStatus.BAD_REQUEST, "规格组名称不能重复");
    for (SpecGroupDto g : p.specGroups()) {
      if (g.options() == null || g.options().isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "规格组选项不能为空");
      if (g.options().size() != g.options().stream().distinct().count()) throw new ApiException(HttpStatus.BAD_REQUEST, "规格组选项不能重复");
    }

    if (p.skus() == null || p.skus().isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "请至少配置 1 个SKU");
    List<String> skuIds = p.skus().stream().map(ProductSkuDto::id).toList();
    if (skuIds.stream().anyMatch(s -> s == null || s.isBlank())) throw new ApiException(HttpStatus.BAD_REQUEST, "SKU ID不能为空");
    if (skuIds.size() != skuIds.stream().distinct().count()) throw new ApiException(HttpStatus.BAD_REQUEST, "SKU ID不能重复");
    if (p.skus().stream().noneMatch(ProductSkuDto::enabled)) throw new ApiException(HttpStatus.BAD_REQUEST, "至少启用 1 个SKU");

    for (ProductSkuDto sku : p.skus()) {
      Double price = sku.price();
      if (price == null || !Double.isFinite(price) || price < 0) throw new ApiException(HttpStatus.BAD_REQUEST, "SKU 价格不合法");
      if (sku.originalPrice() != null && (!Double.isFinite(sku.originalPrice()) || sku.originalPrice() < 0)) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "SKU 原价不合法");
      }
      Integer stock = sku.stock();
      if (stock == null || stock < 0) throw new ApiException(HttpStatus.BAD_REQUEST, "SKU 库存不合法");

      if (sku.specs() == null) throw new ApiException(HttpStatus.BAD_REQUEST, "SKU 规格不能为空");
      for (SpecGroupDto g : p.specGroups()) {
        String v = sku.specs().get(g.name());
        if (v == null || v.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "SKU 规格不完整");
        if (!g.options().contains(v)) throw new ApiException(HttpStatus.BAD_REQUEST, "SKU 规格值不在可选范围内");
      }
    }
  }

  private static CategoryDto toDto(CategoryEntity e) {
    return new CategoryDto(e.getId(), e.getName(), e.getImage());
  }

  private static ProductDto toDto(ProductEntity e) {
    return new ProductDto(
        e.getId(),
        e.getName(),
        e.getBrand(),
        e.getModel(),
        e.getReference(),
        e.getCollection(),
        e.getPrice(),
        e.getOriginalPrice(),
        e.getImage(),
        e.getImages(),
        e.getTag(),
        e.getCategory(),
        e.getDescription(),
        e.getStatus(),
        e.getSortOrder(),
        e.getMetaTitle(),
        e.getMetaDescription(),
        e.getSpecGroups(),
        e.getSkus(),
        e.getBrandId(),
        e.getModelId()
    );
  }

  private static ProductEntity toEntity(ProductDto dto) {
    ProductEntity e = new ProductEntity();
    e.setId(dto.id().trim());
    e.setName(dto.name().trim());
    e.setBrand(dto.brand() == null ? null : dto.brand().trim());
    e.setBrandId(dto.brandId() == null ? null : dto.brandId().trim());
    e.setModel(dto.model() == null ? null : dto.model().trim());
    e.setModelId(dto.modelId() == null ? null : dto.modelId().trim());
    e.setReference(dto.reference() == null ? null : dto.reference().trim());
    e.setCollection(dto.collection().trim());
    e.setPrice(dto.price());
    e.setOriginalPrice(dto.originalPrice());
    e.setImage(dto.image().trim());
    e.setImages(dto.images() == null ? List.of(dto.image().trim()) : dto.images());
    e.setTag(dto.tag() == null ? null : dto.tag().trim());
    e.setCategory(dto.category().trim());
    e.setDescription(dto.description() == null ? null : dto.description().trim());
    e.setStatus(dto.status().trim());
    e.setSortOrder(dto.sortOrder() != null ? dto.sortOrder() : 0);
    e.setMetaTitle(dto.metaTitle());
    e.setMetaDescription(dto.metaDescription());
    e.setSpecGroups(dto.specGroups() == null ? List.of() : dto.specGroups());
    e.setSkus(dto.skus() == null ? List.of() : dto.skus());
    return e;
  }

  private static ProductDto normalize(ProductDto p) {
    String status = (p.status() == null || p.status().isBlank()) ? "on" : p.status().trim().toLowerCase(Locale.ROOT);
    if (!(status.equals("on") || status.equals("off"))) status = "on";

    String brand = normalizeText(p.brand());
    String model = normalizeText(p.model());
    String reference = normalizeText(p.reference());
    String tag = normalizeText(p.tag());
    String description = p.description() == null ? null : p.description().trim();

    List<SpecGroupDto> specGroups = p.specGroups() == null ? new ArrayList<>() : new ArrayList<>(p.specGroups());
    specGroups = specGroups.stream()
        .map(g -> new SpecGroupDto(
            String.valueOf(g.name()).trim().isBlank() ? "Spec" : String.valueOf(g.name()).trim(),
            g.options() == null ? List.of() : g.options().stream().map(o -> String.valueOf(o).trim()).filter(s -> !s.isBlank()).toList()
        ))
        .filter(g -> g.options() != null && !g.options().isEmpty())
        .toList();

    List<ProductSkuDto> skus = p.skus() == null ? new ArrayList<>() : new ArrayList<>(p.skus());
    skus = skus.stream()
        .map(s -> new ProductSkuDto(
            String.valueOf(s.id()).trim().isBlank() ? p.id().trim() + "-sku" : String.valueOf(s.id()).trim(),
            s.specs() == null ? java.util.Map.of() : s.specs(),
            s.price() == null ? p.price() : s.price(),
            s.originalPrice() == null ? p.originalPrice() : s.originalPrice(),
            s.stock() == null ? 0 : Math.max(0, s.stock()),
            s.enabled() == null ? Boolean.TRUE : s.enabled()
        ))
        .filter(s -> s.price() != null && Double.isFinite(s.price()))
        .toList();

    if (specGroups.isEmpty()) {
      specGroups = List.of(new SpecGroupDto("Default", List.of("Default")));
    }
    if (skus.isEmpty()) {
      skus = List.of(new ProductSkuDto(
          p.id().trim() + "-default",
          java.util.Map.of(specGroups.getFirst().name(), specGroups.getFirst().options().getFirst()),
          p.price(),
          p.originalPrice(),
          100,
          true
      ));
    }

    List<ProductSkuDto> salableSkus = skus.stream().filter(s -> s.enabled() && s.stock() != null && s.stock() > 0).toList();
    List<ProductSkuDto> enabledSkus = skus.stream().filter(ProductSkuDto::enabled).toList();
    List<ProductSkuDto> priceSource = !salableSkus.isEmpty() ? salableSkus : (enabledSkus.isEmpty() ? skus : enabledSkus);
    double minPrice = priceSource.stream().map(ProductSkuDto::price).filter(Objects::nonNull).min(Double::compareTo).orElse(p.price());
    List<Double> originals = priceSource.stream().map(ProductSkuDto::originalPrice).filter(Objects::nonNull).toList();
    Double minOriginal = originals.isEmpty() ? null : originals.stream().min(Double::compareTo).orElse(null);

    List<String> images = p.images() == null ? new ArrayList<>() : new ArrayList<>(p.images());
    images = images.stream()
        .map(s -> s == null ? "" : s.trim())
        .filter(s -> !s.isBlank())
        .filter(s -> isAllowedImageUrl(s.toLowerCase(Locale.ROOT)) && s.length() <= 1024)
        .distinct()
        .limit(20)
        .toList();
    String image = p.image() == null ? "" : p.image().trim();
    if (image.isBlank() && !images.isEmpty()) image = images.getFirst();
    if (images.isEmpty() && !image.isBlank()) images = List.of(image);

    return new ProductDto(
        p.id().trim(),
        p.name().trim(),
        brand,
        model,
        reference,
        p.collection().trim(),
        minPrice,
        minOriginal,
        image,
        images,
        tag,
        p.category().trim(),
        description,
        status,
        p.sortOrder() != null ? p.sortOrder() : 0,
        normalizeText(p.metaTitle()),
        normalizeText(p.metaDescription()),
        specGroups,
        skus,
        normalizeText(p.brandId()),
        normalizeText(p.modelId())
    );
  }

  private static String normalizeText(String value) {
    if (value == null) return null;
    String v = value.trim();
    if (v.isBlank()) return null;
    v = v.replaceAll("\\s+", " ");
    return v;
  }

  private static boolean isAllowedImageUrl(String value) {
    return value.startsWith("http://")
        || value.startsWith("https://")
        || value.startsWith("/uploads/")
        || value.startsWith("/api/uploads/");
  }
}
