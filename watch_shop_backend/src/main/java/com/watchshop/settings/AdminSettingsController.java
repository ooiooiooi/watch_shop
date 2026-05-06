package com.watchshop.settings;

import com.watchshop.settings.SettingsDtos.CustomerServiceConfigDto;
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
}

