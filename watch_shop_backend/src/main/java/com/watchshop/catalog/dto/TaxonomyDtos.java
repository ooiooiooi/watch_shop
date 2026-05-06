package com.watchshop.catalog.dto;

import jakarta.validation.constraints.NotBlank;

public final class TaxonomyDtos {
  private TaxonomyDtos() {}

  public record BrandDto(
      @NotBlank(message = "品牌ID不能为空") String id,
      @NotBlank(message = "品牌名称不能为空") String name,
      String image
  ) {}

  public record ModelDto(
      @NotBlank(message = "型号ID不能为空") String id,
      @NotBlank(message = "品牌ID不能为空") String brandId,
      @NotBlank(message = "型号名称不能为空") String name,
      String image
  ) {}
}

