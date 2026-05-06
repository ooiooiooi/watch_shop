package com.watchshop.catalog;

import com.watchshop.catalog.dto.TaxonomyDtos.BrandDto;
import com.watchshop.catalog.dto.TaxonomyDtos.ModelDto;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminTaxonomyController {
  private final TaxonomyService taxonomyService;

  public AdminTaxonomyController(TaxonomyService taxonomyService) {
    this.taxonomyService = taxonomyService;
  }

  @GetMapping("/brands")
  public List<BrandDto> brands() {
    return taxonomyService.listBrands();
  }

  @PostMapping("/brands")
  public BrandDto createBrand(@Valid @RequestBody BrandDto dto) {
    return taxonomyService.createBrand(dto);
  }

  @PutMapping("/brands/{id}")
  public BrandDto updateBrand(@PathVariable String id, @Valid @RequestBody BrandDto dto) {
    return taxonomyService.updateBrand(id, dto);
  }

  @DeleteMapping("/brands/{id}")
  public void deleteBrand(@PathVariable String id) {
    taxonomyService.deleteBrand(id);
  }

  @GetMapping("/models")
  public List<ModelDto> models(@RequestParam Optional<String> brandId) {
    return taxonomyService.listModels(brandId);
  }

  @PostMapping("/models")
  public ModelDto createModel(@Valid @RequestBody ModelDto dto) {
    return taxonomyService.createModel(dto);
  }

  @PutMapping("/models/{id}")
  public ModelDto updateModel(@PathVariable String id, @Valid @RequestBody ModelDto dto) {
    return taxonomyService.updateModel(id, dto);
  }

  @DeleteMapping("/models/{id}")
  public void deleteModel(@PathVariable String id) {
    taxonomyService.deleteModel(id);
  }
}

