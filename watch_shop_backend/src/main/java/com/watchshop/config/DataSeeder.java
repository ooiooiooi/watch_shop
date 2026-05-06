package com.watchshop.config;

import com.watchshop.admin.AdminUserEntity;
import com.watchshop.admin.AdminUserRepository;
import com.watchshop.catalog.CatalogService;
import com.watchshop.catalog.TaxonomyService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements ApplicationRunner {
  private final AppProperties props;
  private final CatalogService catalogService;
  private final TaxonomyService taxonomyService;
  private final AdminUserRepository adminUserRepository;
  private final PasswordEncoder passwordEncoder;

  public DataSeeder(AppProperties props, CatalogService catalogService, TaxonomyService taxonomyService, AdminUserRepository adminUserRepository, PasswordEncoder passwordEncoder) {
    this.props = props;
    this.catalogService = catalogService;
    this.taxonomyService = taxonomyService;
    this.adminUserRepository = adminUserRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  public void run(ApplicationArguments args) {
    if (!props.seed().enabled()) return;

    adminUserRepository.findByUsername("admin").orElseGet(() -> {
      AdminUserEntity u = new AdminUserEntity();
      u.setUsername("admin");
      u.setPasswordHash(passwordEncoder.encode("admin123"));
      u.setPasswordTemporary(true);
      return adminUserRepository.save(u);
    });

    taxonomyService.ensureSeeded();
    catalogService.ensureSeeded();
  }
}
