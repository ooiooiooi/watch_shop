package com.watchshop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class WatchShopBackendApplication {
  public static void main(String[] args) {
    SpringApplication.run(WatchShopBackendApplication.class, args);
  }
}
