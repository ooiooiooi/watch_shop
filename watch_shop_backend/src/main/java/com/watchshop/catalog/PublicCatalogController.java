package com.watchshop.catalog;

import com.watchshop.catalog.dto.CatalogDtos.CategoryDto;
import com.watchshop.catalog.dto.CatalogDtos.ProductDto;
import com.watchshop.common.PageResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicCatalogController {
  private final CatalogService catalogService;

  public PublicCatalogController(CatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping("/categories")
  public List<CategoryDto> categories() {
    return catalogService.listCategories();
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
    return catalogService.listProductsPage(category, status, brand, model, brandId, modelId, q, sort, page.orElse(0), size.orElse(24));
  }

  @GetMapping("/products/{id}")
  public ProductDto product(@PathVariable String id) {
    return catalogService.getProduct(id);
  }

  @GetMapping("/products/{id}/related")
  public List<ProductDto> related(
      @PathVariable String id,
      @RequestParam Optional<Integer> limit
  ) {
    return catalogService.listRelatedProducts(id, limit.orElse(4));
  }
}
