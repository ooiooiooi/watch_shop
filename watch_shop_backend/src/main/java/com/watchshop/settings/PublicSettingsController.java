package com.watchshop.settings;

import com.watchshop.settings.SettingsDtos.CustomerServiceConfigDto;
import com.watchshop.settings.SettingsDtos.HotProductsConfigDto;
import com.watchshop.settings.SettingsDtos.MaintenanceConfigDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/settings")
public class PublicSettingsController {
  private final SettingsService settingsService;

  public PublicSettingsController(SettingsService settingsService) {
    this.settingsService = settingsService;
  }

  @GetMapping("/customer-service")
  public CustomerServiceConfigDto customerService() {
    return settingsService.getCustomerService();
  }

  @GetMapping("/hot-products")
  public HotProductsConfigDto hotProducts() {
    return settingsService.getHotProductsForPublic();
  }

  @GetMapping("/maintenance")
  public MaintenanceConfigDto maintenance() {
    return settingsService.getMaintenanceConfig();
  }
}
