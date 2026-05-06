package com.watchshop.settings;

public final class SettingsDtos {
  private SettingsDtos() {}

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
}
