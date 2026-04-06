/**
 * Pixel tracking utility for Meta (Facebook/Instagram) and Google Ads
 * Fires conversion events on key user actions
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fire Meta Pixel "Lead" event when loan form is submitted */
export function trackLoanSubmit(vehicleName?: string) {
  if (window.fbq) {
    window.fbq("track", "Lead", {
      content_name: vehicleName || "貸款諮詢",
      content_category: "loan_inquiry",
      currency: "TWD",
    });
  }
  if (window.gtag) {
    window.gtag("event", "conversion", {
      send_to: "AW-PLACEHOLDER/loan_submit",
      event_category: "lead",
      event_label: vehicleName || "loan_inquiry",
    });
  }
}

/** Fire Meta Pixel "Schedule" event when appointment form is submitted */
export function trackAppointmentSubmit(vehicleName?: string) {
  if (window.fbq) {
    window.fbq("track", "Schedule", {
      content_name: vehicleName || "預約看車",
      content_category: "appointment",
    });
  }
  if (window.gtag) {
    window.gtag("event", "conversion", {
      send_to: "AW-PLACEHOLDER/appointment_submit",
      event_category: "lead",
      event_label: vehicleName || "appointment",
    });
  }
}

/** Fire Meta Pixel "Contact" event when phone is clicked */
export function trackPhoneClick() {
  if (window.fbq) {
    window.fbq("track", "Contact", {
      content_category: "phone_call",
    });
  }
  if (window.gtag) {
    window.gtag("event", "conversion", {
      send_to: "AW-PLACEHOLDER/phone_click",
      event_category: "contact",
      event_label: "phone_call",
    });
  }
}

/** Fire Meta Pixel "ViewContent" event when a vehicle detail is viewed */
export function trackVehicleView(vehicleName: string, price?: number) {
  if (window.fbq) {
    window.fbq("track", "ViewContent", {
      content_name: vehicleName,
      content_category: "vehicle",
      value: price,
      currency: "TWD",
    });
  }
}

/** Fire Meta Pixel "FindLocation" event when address/map is clicked */
export function trackMapClick() {
  if (window.fbq) {
    window.fbq("track", "FindLocation");
  }
}
