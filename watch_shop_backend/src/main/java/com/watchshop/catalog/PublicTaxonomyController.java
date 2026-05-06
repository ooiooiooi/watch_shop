package com.watchshop.catalog;

import com.watchshop.catalog.dto.TaxonomyDtos.BrandDto;
import com.watchshop.catalog.dto.TaxonomyDtos.ModelDto;
import java.util.List;
import java.util.Optional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicTaxonomyController {
  private final TaxonomyService taxonomyService;

  public PublicTaxonomyController(TaxonomyService taxonomyService) {
    this.taxonomyService = taxonomyService;
  }

  @GetMapping("/brands")
  public List<BrandDto> brands() {
    return taxonomyService.listBrands();
  }

  @GetMapping("/models")
  public List<ModelDto> models(@RequestParam Optional<String> brandId) {
    return taxonomyService.listModels(brandId);
  }
}

