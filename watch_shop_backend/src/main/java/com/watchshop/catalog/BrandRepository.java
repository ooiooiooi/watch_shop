package com.watchshop.catalog;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BrandRepository extends JpaRepository<BrandEntity, String> {
  Optional<BrandEntity> findFirstByNameIgnoreCase(String name);
}
