package com.watchshop.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WatchModelRepository extends JpaRepository<WatchModelEntity, String> {
  List<WatchModelEntity> findByBrandIdOrderByNameAsc(String brandId);
  Optional<WatchModelEntity> findFirstByBrandIdAndNameIgnoreCase(String brandId, String name);
}
