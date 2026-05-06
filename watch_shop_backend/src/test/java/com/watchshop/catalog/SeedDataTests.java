package com.watchshop.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import org.junit.jupiter.api.Test;

class SeedDataTests {

  @Test
  void seedProductsShouldBeUniqueAndNonTrivial() {
    SeedData seed = new SeedData();
    var products = seed.seedProducts();
    assertTrue(products.size() >= 20);
    var ids = new HashSet<String>();
    for (var p : products) {
      assertTrue(ids.add(p.id()));
    }
    assertEquals(products.size(), ids.size());
  }
}

