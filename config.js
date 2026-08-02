// config.js
export const CONFIG = {
  /* =========================================================
     PROYECTO
     ========================================================= */
  PROJECT_NAME: "Crédito Paula Medina",

  /* =========================================================
     FUENTE DE DATOS
     TSV publicado desde Google Sheets
     Debe incluir columnas: Fecha | Mes | Valor
     ========================================================= */
  TSV_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQ4gxiZuFmAvTZBK3Jk7-bhxQkuvFm7hqdycT1QoSIsqFirjWGOXHwfsuBDiUIAZKRk8AG6oCOyxnq/pub?gid=0&single=true&output=tsv",

  /* =========================================================
     WEB APP DE GOOGLE APPS SCRIPT
     Pega aquí la URL final del despliegue terminado en /exec.
     Si está configurada, el front lee datos frescos desde Apps Script
     y también registra nuevos abonos desde el formulario.
     ========================================================= */
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxiRDZO-hAGL2As5eg5dLZ9LiK-wmhaf39FmxkN3ff_YkyfH3_IFILjTfxPnPsRM5iWqw/exec",

  /* =========================================================
     CONDICIONES REALES DEL CRÉDITO
     El desembolso es el dinero recibido. El seguimiento usa el
     compromiso total: 48 cuotas del crédito + seguros mensuales.
     ========================================================= */
  DISBURSED_AMOUNT: 4500000,
  TERM_MONTHS: 48,
  LOAN_MONTHLY_PAYMENT: 148670,
  LIFE_INSURANCE_MONTHLY: 6930,
  EMPLOYMENT_INSURANCE_MONTHLY: 12636,

  /* Valor sugerido al registrar un pago. Sigue siendo editable. */
  DEFAULT_PAYMENT_AMOUNT: 168236,

  /* =========================================================
     PROYECCIÓN POR DEFECTO
     Opciones:
     - "last_month_avg_6"
     - "last_month"
     - "all_month_avg"
     - "manual"
     ========================================================= */
  DEFAULT_PROJECTION_MODE: "manual",

  /* =========================================================
     CUOTA MANUAL SUGERIDA
     Solo se usa cuando el modo de proyección es "manual"
     ========================================================= */
  DEFAULT_MANUAL_MONTHLY_PAYMENT: 168236,
};
