package com.watchshop.settings;

import com.watchshop.settings.SettingsDtos.CustomerServiceConfigDto;
import com.watchshop.settings.SettingsDtos.HotProductsConfigDto;
import com.watchshop.settings.SettingsDtos.MaintenanceConfigDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {
  private final SettingsService settingsService;

  public AdminSettingsController(SettingsService settingsService) {
    this.settingsService = settingsService;
  }

  @GetMapping("/customer-service")
  public CustomerServiceConfigDto customerService() {
    return settingsService.getCustomerService();
  }

  @PutMapping("/customer-service")
  public CustomerServiceConfigDto updateCustomerService(@RequestBody CustomerServiceConfigDto dto) {
    return settingsService.updateCustomerService(dto);
  }

  @GetMapping("/hot-products")
  public HotProductsConfigDto hotProducts() {
    return settingsService.getHotProductsForAdmin();
  }

  @PutMapping("/hot-products")
  public HotProductsConfigDto updateHotProducts(@RequestBody HotProductsConfigDto dto) {
    return settingsService.updateHotProducts(dto);
  }

  @GetMapping("/maintenance")
  public MaintenanceConfigDto maintenance() {
    return settingsService.getMaintenanceConfig();
  }

  @PutMapping("/maintenance")
  public MaintenanceConfigDto updateMaintenance(@RequestBody MaintenanceConfigDto dto) {
    return settingsService.updateMaintenanceConfig(dto);
  }
}
