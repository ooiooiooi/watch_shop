package com.watchshop.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import java.util.Map;

public final class CatalogDtos {
  private CatalogDtos() {}

  public record CategoryDto(
      @NotBlank(message = "分类ID不能为空") String id,
      @NotBlank(message = "分类名称不能为空") String name,
      @NotBlank(message = "分类图片不能为空") String image
  ) {}

  public record SpecGroupDto(
      @NotBlank(message = "规格组名称不能为空") String name,
      @NotNull(message = "规格组选项不能为空") List<@NotBlank(message = "规格组选项不能为空") String> options
  ) {}

  public record ProductSkuDto(
      @NotBlank(message = "SKU ID不能为空") String id,
      @NotNull(message = "SKU specs不能为空") Map<String, String> specs,
      @NotNull(message = "SKU 价格不能为空") @PositiveOrZero(message = "SKU 价格不能为负数") Double price,
      @PositiveOrZero(message = "SKU 原价不能为负数") Double originalPrice,
      @NotNull(message = "SKU 库存不能为空") @PositiveOrZero(message = "SKU 库存不能为负数") Integer stock,
      @NotNull(message = "SKU enabled不能为空") Boolean enabled
  ) {}

  public record ProductDto(
      @NotBlank(message = "商品ID不能为空") String id,
      @NotBlank(message = "商品名称不能为空") String name,
      String brand,
      String model,
      String reference,
      @NotBlank(message = "商品系列不能为空") String collection,
      @NotNull(message = "商品价格不能为空") @PositiveOrZero(message = "商品价格不能为负数") Double price,
      @PositiveOrZero(message = "商品原价不能为负数") Double originalPrice,
      @NotBlank(message = "商品图片不能为空") String image,
      List<String> images,
      String tag,
      @NotBlank(message = "商品分类不能为空") String category,
      String description,
      @NotBlank(message = "商品状态不能为空") String status,
      Integer sortOrder,
      String metaTitle,
      String metaDescription,
      @Valid List<SpecGroupDto> specGroups,
      @Valid List<ProductSkuDto> skus,
      String brandId,
      String modelId
  ) {
    public ProductDto(
        String id,
        String name,
        String brand,
        String model,
        String reference,
        String collection,
        Double price,
        Double originalPrice,
        String image,
        List<String> images,
        String tag,
        String category,
        String description,
        String status,
        List<SpecGroupDto> specGroups,
        List<ProductSkuDto> skus
    ) {
      this(id, name, brand, model, reference, collection, price, originalPrice, image, images, tag, category, description, status, 0, null, null, specGroups, skus, null, null);
    }

    public ProductDto(
        String id,
        String name,
        String brand,
        String model,
        String reference,
        String collection,
        Double price,
        Double originalPrice,
        String image,
        String tag,
        String category,
        String description,
        String status,
        List<SpecGroupDto> specGroups,
        List<ProductSkuDto> skus
    ) {
      this(id, name, brand, model, reference, collection, price, originalPrice, image, null, tag, category, description, status, 0, null, null, specGroups, skus, null, null);
    }

    public ProductDto(
        String id,
        String name,
        String brand,
        String model,
        String reference,
        String collection,
        Double price,
        Double originalPrice,
        String image,
        List<String> images,
        String tag,
        String category,
        String description,
        String status,
        List<SpecGroupDto> specGroups,
        List<ProductSkuDto> skus,
        String brandId,
        String modelId
    ) {
      this(id, name, brand, model, reference, collection, price, originalPrice, image, images, tag, category, description, status, 0, null, null, specGroups, skus, brandId, modelId);
    }
  }
}
