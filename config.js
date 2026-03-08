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
  DEFAULT_MANUAL_MONTHLY_PAYMENT: 300000,
};