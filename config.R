app_dir <- tryCatch(normalizePath(sys.frame(1)$ofile, winslash = "/", mustWork = FALSE), error = function(e) "")
app_dir <- if (nzchar(app_dir)) dirname(app_dir) else normalizePath(getwd(), winslash = "/", mustWork = TRUE)

geo_config <- list(
  app_dir = app_dir,
  llm_svg_dir = file.path(app_dir, "svg"),
  llm_url = "http://1.117.188.4:5200/wenxinqianfan",
  wenxin_api_key = "z9LQiF34PzazRt3Bhenu0ey9",
  wenxin_secret_key = "n9FLmBesVrDy9V8qlStA8b0VkgujXoZl",
  api_base_url = "http://127.0.0.1:8000/api/v1",
  db_config = list(
    host = "127.0.0.1",
    user = "root",
    password = "",
    dbname = "geo",
    charset = "utf8mb4",
    port = 3306
  )
)
