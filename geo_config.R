app_dir <- tryCatch(normalizePath(sys.frame(1)$ofile, winslash = "/", mustWork = FALSE), error = function(e) "")
app_dir <- if (nzchar(app_dir)) dirname(app_dir) else normalizePath(getwd(), winslash = "/", mustWork = TRUE)

geo_config <- list(
  app_dir = app_dir,
  llm_icon_dir = file.path(app_dir, "icons"),
  llm_svg_dir = file.path(app_dir, "svg"),
  llm_url = "http://YOUR_LLM_HOST:5200/wenxinqianfan",
  db_config = list(
    host = "YOUR_DB_HOST",
    user = "root",
    password = "YOUR_DB_PASSWORD",
    dbname = "geo",
    charset = "utf8mb4",
    port = 3306
  )
)
