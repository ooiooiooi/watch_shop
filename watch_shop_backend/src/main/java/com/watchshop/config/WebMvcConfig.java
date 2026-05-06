package com.watchshop.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
    String uploadPath = uploadDir.toUri().toString();

    // Keep both paths for backward compatibility and for frontend apps served behind /api proxy.
    registry.addResourceHandler("/uploads/**")
            .addResourceLocations(uploadPath);
    registry.addResourceHandler("/api/uploads/**")
            .addResourceLocations(uploadPath);
  }
}
