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
     VALOR PREDETERMINADO PARA REGISTRAR CUOTAS
     El campo del front arranca en $150.000, pero queda editable.
     ========================================================= */
  DEFAULT_PAYMENT_AMOUNT: 150000,

  /* =========================================================
     VALOR TOTAL DEL CRÉDITO
     ========================================================= */
  TOTAL_CREDITO: 4500000,

  /* =========================================================
     PROYECCIÓN POR DEFECTO
     Opciones:
     - "last_month_avg_6"
     - "last_month"
     - "all_month_avg"
     - "manual"
     ========================================================= */
  DEFAULT_PROJECTION_MODE: "last_month_avg_6",

  /* =========================================================
     CUOTA MANUAL SUGERIDA
     Solo se usa cuando el modo de proyección es "manual"
     ========================================================= */
  DEFAULT_MANUAL_MONTHLY_PAYMENT: 150000,
};