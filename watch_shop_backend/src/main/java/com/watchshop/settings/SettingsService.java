package com.watchshop.settings;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.watchshop.catalog.BrandEntity;
import com.watchshop.catalog.BrandRepository;
import com.watchshop.catalog.CatalogService;
import com.watchshop.catalog.ProductEntity;
import com.watchshop.catalog.ProductRepository;
import com.watchshop.common.ApiException;
import com.watchshop.settings.SettingsDtos.CustomerServiceConfigDto;
import com.watchshop.settings.SettingsDtos.HotProductsBrandGroupDto;
import com.watchshop.settings.SettingsDtos.HotProductsConfigDto;
import com.watchshop.settings.SettingsDtos.MaintenanceConfigDto;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
public class SettingsService {
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final TypeReference<HotProductsConfigDto> HOT_PRODUCTS_TYPE = new TypeReference<>() {};
  private static final String KEY_CUSTOMER_SERVICE_WHATSAPP = "customer_service.whatsapp";
  private static final String KEY_CUSTOMER_SERVICE_DISPLAY_NAME = "customer_service.display_name";
  private static final String KEY_CUSTOMER_SERVICE_HOURS = "customer_service.hours";
  private static final String KEY_CUSTOMER_SERVICE_DEFAULT_MESSAGE = "customer_service.default_message";
  private static final String KEY_ORDER_MODE = "order.mode";
  private static final String KEY_ORDER_BUTTON_LABEL = "order.button_label";
  private static final String KEY_ORDER_MESSAGE_TEMPLATE = "order.message_template";
  private static final String KEY_ORDER_SHOW_BUY_BUTTONS = "order.show_buy_buttons";
  private static final String KEY_HOME_HOT_PRODUCTS = "home.hot_products";
  private static final String KEY_MAINTENANCE_ENABLED = "site.maintenance.enabled";
  private static final String KEY_MAINTENANCE_TITLE = "site.maintenance.title";
  private static final String KEY_MAINTENANCE_MESSAGE = "site.maintenance.message";
  private static final String KEY_MAINTENANCE_BUTTON_LABEL = "site.maintenance.button_label";
  private static final String DEFAULT_WHATSAPP = "8613800138000";
  private static final String DEFAULT_DISPLAY_NAME = "Watch Shop Support";
  private static final String DEFAULT_HOURS = "Mon-Sat 10:00-19:00";
  private static final String DEFAULT_MESSAGE = "你好，我想咨询一下商品";
  private static final String DEFAULT_ORDER_MODE = "chat";
  private static final String DEFAULT_ORDER_BUTTON_LABEL = "通过 WhatsApp发送询价";
  private static final String DEFAULT_ORDER_MESSAGE_TEMPLATE = "{defaultMessage}\n{productName} (ID: {productId})\n{url}";
  private static final boolean DEFAULT_SHOW_BUY_BUTTONS = false;
  private static final boolean DEFAULT_MAINTENANCE_ENABLED = false;
  private static final String DEFAULT_MAINTENANCE_TITLE = "网站维护中";
  private static final String DEFAULT_MAINTENANCE_MESSAGE = "我们正在进行系统维护，请稍后再试。如需帮助，请通过 WhatsApp 联系我们。";
  private static final String DEFAULT_MAINTENANCE_BUTTON_LABEL = "通过 WhatsApp发送询价";

  private final AppSettingRepository repo;
  private final BrandRepository brandRepository;
  private final ProductRepository productRepository;
  private final CatalogService catalogService;

  public SettingsService(
      AppSettingRepository repo,
      BrandRepository brandRepository,
      ProductRepository productRepository,
      CatalogService catalogService
  ) {
    this.repo = repo;
    this.brandRepository = brandRepository;
    this.productRepository = productRepository;
    this.catalogService = catalogService;
  }

  public CustomerServiceConfigDto getCustomerService() {
    String whatsapp = read(KEY_CUSTOMER_SERVICE_WHATSAPP);
    String displayName = read(KEY_CUSTOMER_SERVICE_DISPLAY_NAME);
    String hours = read(KEY_CUSTOMER_SERVICE_HOURS);
    String defaultMessage = read(KEY_CUSTOMER_SERVICE_DEFAULT_MESSAGE);
    String orderMode = read(KEY_ORDER_MODE);
    String orderButtonLabel = read(KEY_ORDER_BUTTON_LABEL);
    String orderMessageTemplate = read(KEY_ORDER_MESSAGE_TEMPLATE);
    String showBuyButtonsRaw = read(KEY_ORDER_SHOW_BUY_BUTTONS);
    Boolean showBuyButtons = showBuyButtonsRaw == null ? null : Boolean.valueOf(showBuyButtonsRaw);
    return new CustomerServiceConfigDto(
        whatsapp == null ? DEFAULT_WHATSAPP : whatsapp,
        displayName == null ? DEFAULT_DISPLAY_NAME : displayName,
        hours == null ? DEFAULT_HOURS : hours,
        defaultMessage == null ? DEFAULT_MESSAGE : defaultMessage,
        orderMode == null ? DEFAULT_ORDER_MODE : normalizeOrderMode(orderMode),
        orderButtonLabel == null ? DEFAULT_ORDER_BUTTON_LABEL : orderButtonLabel,
        orderMessageTemplate == null ? DEFAULT_ORDER_MESSAGE_TEMPLATE : orderMessageTemplate,
        showBuyButtons == null ? DEFAULT_SHOW_BUY_BUTTONS : showBuyButtons
    );
  }

  public CustomerServiceConfigDto updateCustomerService(CustomerServiceConfigDto dto) {
    String whatsapp = normalizeWhatsapp(dto == null ? null : dto.whatsapp());
    String displayName = normalizeText(dto == null ? null : dto.displayName(), 80, "客服名称");
    String hours = normalizeText(dto == null ? null : dto.hours(), 120, "工作时间");
    String defaultMessage = normalizeText(dto == null ? null : dto.defaultMessage(), 300, "默认消息");
    String orderMode = normalizeOrderMode(dto == null ? null : dto.orderMode());
    String orderButtonLabel = normalizeText(dto == null ? null : dto.orderButtonLabel(), 40, "下单按钮文案");
    String orderMessageTemplate = normalizeText(dto == null ? null : dto.orderMessageTemplate(), 600, "下单消息模板");
    Boolean showBuyButtons = dto == null ? null : dto.showBuyButtons();

    write(KEY_CUSTOMER_SERVICE_WHATSAPP, whatsapp);
    write(KEY_CUSTOMER_SERVICE_DISPLAY_NAME, displayName);
    write(KEY_CUSTOMER_SERVICE_HOURS, hours);
    write(KEY_CUSTOMER_SERVICE_DEFAULT_MESSAGE, defaultMessage);
    write(KEY_ORDER_MODE, orderMode);
    write(KEY_ORDER_BUTTON_LABEL, orderButtonLabel);
    write(KEY_ORDER_MESSAGE_TEMPLATE, orderMessageTemplate);
    write(KEY_ORDER_SHOW_BUY_BUTTONS, showBuyButtons == null ? null : String.valueOf(showBuyButtons));
    return getCustomerService();
  }

  public HotProductsConfigDto getHotProductsForAdmin() {
    return enrichHotProducts(readHotProducts(), false);
  }

  public HotProductsConfigDto getHotProductsForPublic() {
    return enrichHotProducts(readHotProducts(), true);
  }

  public HotProductsConfigDto updateHotProducts(HotProductsConfigDto dto) {
    HotProductsConfigDto normalized = normalizeHotProducts(dto);
    writeJson(KEY_HOME_HOT_PRODUCTS, normalized);
    return getHotProductsForAdmin();
  }

  public MaintenanceConfigDto getMaintenanceConfig() {
    String enabledRaw = read(KEY_MAINTENANCE_ENABLED);
    Boolean enabled = enabledRaw == null ? null : Boolean.valueOf(enabledRaw);
    String title = read(KEY_MAINTENANCE_TITLE);
    String message = read(KEY_MAINTENANCE_MESSAGE);
    String buttonLabel = read(KEY_MAINTENANCE_BUTTON_LABEL);
    return new MaintenanceConfigDto(
        enabled == null ? DEFAULT_MAINTENANCE_ENABLED : enabled,
        title == null ? DEFAULT_MAINTENANCE_TITLE : title,
        message == null ? DEFAULT_MAINTENANCE_MESSAGE : message,
        buttonLabel == null ? DEFAULT_MAINTENANCE_BUTTON_LABEL : buttonLabel
    );
  }

  public MaintenanceConfigDto updateMaintenanceConfig(MaintenanceConfigDto dto) {
    Boolean enabled = dto == null ? null : dto.enabled();
    String title = normalizeText(dto == null ? null : dto.title(), 120, "维护标题");
    String message = normalizeText(dto == null ? null : dto.message(), 600, "维护说明");
    String buttonLabel = normalizeText(dto == null ? null : dto.buttonLabel(), 40, "维护按钮文案");

    write(KEY_MAINTENANCE_ENABLED, String.valueOf(Boolean.TRUE.equals(enabled)));
    write(KEY_MAINTENANCE_TITLE, title);
    write(KEY_MAINTENANCE_MESSAGE, message);
    write(KEY_MAINTENANCE_BUTTON_LABEL, buttonLabel);
    return getMaintenanceConfig();
  }

  public boolean isMaintenanceEnabled() {
    return Boolean.TRUE.equals(getMaintenanceConfig().enabled());
  }

  private String read(@NonNull String key) {
    Optional<AppSettingEntity> entity = repo.findById(key);
    String v = entity.isPresent() ? entity.get().getSettingValue() : null;
    if (v == null || v.isBlank()) return null;
    return v;
  }

  private void write(@NonNull String key, String value) {
    AppSettingEntity e = repo.findById(key).orElseGet(() -> {
      AppSettingEntity created = new AppSettingEntity();
      created.setSettingKey(key);
      return created;
    });
    e.setSettingValue(value == null ? "" : value);
    repo.save(e);
  }

  private HotProductsConfigDto readHotProducts() {
    String raw = read(KEY_HOME_HOT_PRODUCTS);
    if (raw == null) return new HotProductsConfigDto(List.of());
    try {
      HotProductsConfigDto parsed = MAPPER.readValue(raw, HOT_PRODUCTS_TYPE);
      return parsed == null ? new HotProductsConfigDto(List.of()) : parsed;
    } catch (Exception e) {
      return new HotProductsConfigDto(List.of());
    }
  }

  private void writeJson(@NonNull String key, Object value) {
    try {
      write(key, MAPPER.writeValueAsString(value));
    } catch (Exception e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "热门商品配置保存失败");
    }
  }

  private HotProductsConfigDto normalizeHotProducts(HotProductsConfigDto dto) {
    if (dto == null || dto.brands() == null) return new HotProductsConfigDto(List.of());
    if (dto.brands().size() > 12) throw new ApiException(HttpStatus.BAD_REQUEST, "热门品牌数量不能超过 12");

    Map<String, HotProductsBrandGroupDto> deduped = new LinkedHashMap<>();
    for (HotProductsBrandGroupDto rawGroup : dto.brands()) {
      if (rawGroup == null) continue;
      String brandId = normalizeText(rawGroup.brandId(), 64, "品牌");
      if (brandId == null) continue;

      BrandEntity brand = brandRepository.findById(brandId)
          .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "品牌不存在"));

      List<String> ids = new ArrayList<>();
      if (rawGroup.productIds() != null) {
        for (String rawId : rawGroup.productIds()) {
          String id = normalizeText(rawId, 64, "商品ID");
          if (id != null && !ids.contains(id)) {
            ids.add(id);
          }
        }
      }
      if (ids.size() > 12) throw new ApiException(HttpStatus.BAD_REQUEST, "每个热门品牌最多配置 12 个商品");

      List<ProductEntity> products = productRepository.findAllById(ids);
      Map<String, ProductEntity> byId = new LinkedHashMap<>();
      for (ProductEntity entity : products) {
        byId.put(entity.getId(), entity);
      }

      for (String id : ids) {
        ProductEntity product = byId.get(id);
        if (product == null) throw new ApiException(HttpStatus.BAD_REQUEST, "热门商品不存在: " + id);
        boolean matchesBrandId = Objects.equals(brand.getId(), product.getBrandId());
        boolean matchesBrandName = product.getBrand() != null && product.getBrand().trim().equalsIgnoreCase(brand.getName());
        if (!matchesBrandId && !matchesBrandName) {
          throw new ApiException(HttpStatus.BAD_REQUEST, "商品不属于品牌「" + brand.getName() + "」: " + id);
        }
      }

      deduped.put(brand.getId(), new HotProductsBrandGroupDto(brand.getId(), brand.getName(), ids, List.of()));
    }

    return new HotProductsConfigDto(List.copyOf(deduped.values()));
  }

  private HotProductsConfigDto enrichHotProducts(HotProductsConfigDto dto, boolean publicOnlyOn) {
    if (dto == null || dto.brands() == null || dto.brands().isEmpty()) {
      return new HotProductsConfigDto(List.of());
    }

    List<HotProductsBrandGroupDto> groups = dto.brands().stream()
        .map(group -> {
          String brandId = group.brandId();
          String fallbackName = group.brandName();
          Optional<BrandEntity> brand = brandId == null ? Optional.empty() : brandRepository.findById(brandId);
          String brandName = brand.map(BrandEntity::getName).orElse(fallbackName);
          List<String> ids = group.productIds() == null ? List.of() : group.productIds().stream().filter(Objects::nonNull).toList();
          List<com.watchshop.catalog.dto.CatalogDtos.ProductDto> products = catalogService.listProductsByIds(ids, publicOnlyOn);
          return new HotProductsBrandGroupDto(
              brandId,
              brandName,
              ids,
              products
          );
        })
        .filter(group -> group.brandId() != null && group.brandName() != null)
        .filter(group -> !publicOnlyOn || !group.products().isEmpty())
        .toList();

    return new HotProductsConfigDto(groups);
  }

  private static String normalizeText(String value, int maxLen, String label) {
    if (value == null) return null;
    String v = value.trim();
    if (v.isBlank()) return null;
    if (v.length() > maxLen) throw new ApiException(HttpStatus.BAD_REQUEST, label + "过长");
    return v;
  }

  private static String normalizeWhatsapp(String value) {
    if (value == null) return null;
    String v = value.trim();
    if (v.isBlank()) return null;
    if (v.length() > 200) throw new ApiException(HttpStatus.BAD_REQUEST, "WhatsApp 配置过长");

    String lower = v.toLowerCase(Locale.ROOT);
    if (lower.startsWith("http://") || lower.startsWith("https://")) return v;

    String digits = v.replaceAll("[^0-9]", "");
    if (digits.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "WhatsApp 账号需为手机号（含国家码）或链接");
    if (digits.length() < 8 || digits.length() > 18) throw new ApiException(HttpStatus.BAD_REQUEST, "WhatsApp 手机号长度不合法");
    return digits;
  }

  private static String normalizeOrderMode(String value) {
    if (value == null) return null;
    String v = value.trim().toLowerCase(Locale.ROOT);
    if (v.isBlank()) return null;
    if (v.equals("chat") || v.equals("checkout") || v.equals("disabled")) return v;
    throw new ApiException(HttpStatus.BAD_REQUEST, "下单模式不合法");
  }
}
