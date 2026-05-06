package com.watchshop.settings;

import com.watchshop.common.ApiException;
import com.watchshop.settings.SettingsDtos.CustomerServiceConfigDto;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SettingsService {
  private static final String KEY_CUSTOMER_SERVICE_WHATSAPP = "customer_service.whatsapp";
  private static final String KEY_CUSTOMER_SERVICE_DISPLAY_NAME = "customer_service.display_name";
  private static final String KEY_CUSTOMER_SERVICE_HOURS = "customer_service.hours";
  private static final String KEY_CUSTOMER_SERVICE_DEFAULT_MESSAGE = "customer_service.default_message";
  private static final String KEY_ORDER_MODE = "order.mode";
  private static final String KEY_ORDER_BUTTON_LABEL = "order.button_label";
  private static final String KEY_ORDER_MESSAGE_TEMPLATE = "order.message_template";
  private static final String KEY_ORDER_SHOW_BUY_BUTTONS = "order.show_buy_buttons";
  private static final String DEFAULT_WHATSAPP = "8613800138000";
  private static final String DEFAULT_DISPLAY_NAME = "Watch Shop Support";
  private static final String DEFAULT_HOURS = "Mon-Sat 10:00-19:00";
  private static final String DEFAULT_MESSAGE = "你好，我想咨询一下商品";
  private static final String DEFAULT_ORDER_MODE = "chat";
  private static final String DEFAULT_ORDER_BUTTON_LABEL = "联系下单";
  private static final String DEFAULT_ORDER_MESSAGE_TEMPLATE = "{defaultMessage}\n{productName} (ID: {productId})\n{url}";
  private static final boolean DEFAULT_SHOW_BUY_BUTTONS = false;

  private final AppSettingRepository repo;

  public SettingsService(AppSettingRepository repo) {
    this.repo = repo;
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

  private String read(String key) {
    String v = repo.findById(key).map(AppSettingEntity::getSettingValue).orElse(null);
    if (v == null || v.isBlank()) return null;
    return v;
  }

  private void write(String key, String value) {
    AppSettingEntity e = repo.findById(key).orElseGet(() -> {
      AppSettingEntity created = new AppSettingEntity();
      created.setSettingKey(key);
      return created;
    });
    e.setSettingValue(value == null ? "" : value);
    repo.save(e);
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
