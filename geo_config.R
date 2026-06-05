app_dir <- tryCatch(normalizePath(sys.frame(1)$ofile, winslash = "/", mustWork = FALSE), error = function(e) "")
app_dir <- if (nzchar(app_dir)) dirname(app_dir) else normalizePath(getwd(), winslash = "/", mustWork = TRUE)

geo_config <- list(
  app_dir = app_dir,
  llm_icon_dir = file.path(app_dir, "icons"),
  llm_svg_dir = file.path(app_dir, "svg"),
  llm_url = "http://1.117.188.4:5200/wenxinqianfan",
  db_config = list(
    host = "1.117.188.4",
    user = "root",
    password = "3POKJzGCs3JNdhum",
    dbname = "geo",
    charset = "utf8mb4",
    port = 3306
  )
)
