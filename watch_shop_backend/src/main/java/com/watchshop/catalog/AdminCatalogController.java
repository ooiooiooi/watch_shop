package com.watchshop.catalog;

import com.watchshop.catalog.dto.CatalogDtos.CategoryDto;
import com.watchshop.catalog.dto.CatalogDtos.ProductDto;
import com.watchshop.common.PageResponse;
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
public class AdminCatalogController {
  private final CatalogService catalogService;
  private final TaxonomyService taxonomyService;

  public AdminCatalogController(CatalogService catalogService, TaxonomyService taxonomyService) {
    this.catalogService = catalogService;
    this.taxonomyService = taxonomyService;
  }

  @GetMapping("/categories")
  public List<CategoryDto> categories() {
    return catalogService.listCategories();
  }

  @PostMapping("/categories")
  public CategoryDto createCategory(@Valid @RequestBody CategoryDto dto) {
    return catalogService.createCategory(dto);
  }

  @PutMapping("/categories/{id}")
  public CategoryDto updateCategory(@PathVariable String id, @Valid @RequestBody CategoryDto dto) {
    return catalogService.updateCategory(id, dto);
  }

  @DeleteMapping("/categories/{id}")
  public void deleteCategory(@PathVariable String id) {
    catalogService.deleteCategory(id);
  }

  @GetMapping("/products")
  public List<ProductDto> products(
      @RequestParam Optional<String> category,
      @RequestParam Optional<String> status,
      @RequestParam Optional<String> brand,
      @RequestParam Optional<String> model,
      @RequestParam Optional<String> brandId,
      @RequestParam Optional<String> modelId,
      @RequestParam Optional<String> q,
      @RequestParam Optional<String> sort
  ) {
    return catalogService.listProducts(category, status, brand, model, brandId, modelId, q, sort);
  }

  @GetMapping("/products/page")
  public PageResponse<ProductDto> productsPage(
      @RequestParam Optional<String> category,
      @RequestParam Optional<String> status,
      @RequestParam Optional<String> brand,
      @RequestParam Optional<String> model,
      @RequestParam Optional<String> brandId,
      @RequestParam Optional<String> modelId,
      @RequestParam Optional<String> q,
      @RequestParam Optional<String> sort,
      @RequestParam Optional<Integer> page,
      @RequestParam Optional<Integer> size
  ) {
    return catalogService.listProductsPage(category, status, brand, model, brandId, modelId, q, sort, page.orElse(0), size.orElse(30));
  }

  @PostMapping("/products")
  public ProductDto createProduct(@Valid @RequestBody ProductDto dto) {
    return catalogService.createProduct(dto);
  }

  @PutMapping("/products/{id}")
  public ProductDto updateProduct(@PathVariable String id, @Valid @RequestBody ProductDto dto) {
    return catalogService.updateProduct(id, dto);
  }

  @DeleteMapping("/products/{id}")
  public void deleteProduct(@PathVariable String id) {
    catalogService.deleteProduct(id);
  }

  @PostMapping("/catalog/reset")
  public void reset() {
    taxonomyService.ensureSeeded();
    catalogService.resetCatalog();
  }
}
