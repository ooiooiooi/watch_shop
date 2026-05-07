package com.watchshop.security;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MaintenanceModeFilterConfig {
  @Bean
  public FilterRegistrationBean<MaintenanceModeFilter> maintenanceModeFilterRegistration(
      MaintenanceModeFilter maintenanceModeFilter
  ) {
    FilterRegistrationBean<MaintenanceModeFilter> registration = new FilterRegistrationBean<>();
    registration.setFilter(maintenanceModeFilter);
    registration.addUrlPatterns("/*");
    registration.setOrder(1);
    return registration;
  }
}
