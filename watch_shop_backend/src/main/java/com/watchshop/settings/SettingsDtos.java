package com.watchshop.settings;

import com.watchshop.catalog.dto.CatalogDtos.ProductDto;
import java.util.List;

public final class SettingsDtos {
  private SettingsDtos() {}

  public record MaintenanceConfigDto(
      Boolean enabled,
      String title,
      String message,
      String buttonLabel
  ) {}

  public record CustomerServiceConfigDto(
      String whatsapp,
      String displayName,
      String hours,
      String defaultMessage,
      String orderMode,
      String orderButtonLabel,
      String orderMessageTemplate,
      Boolean showBuyButtons
  ) {}

  public record HotProductsBrandGroupDto(
      String brandId,
      String brandName,
      List<String> productIds,
      List<ProductDto> products
  ) {}

  public record HotProductsConfigDto(
      List<HotProductsBrandGroupDto> brands
  ) {}
}
