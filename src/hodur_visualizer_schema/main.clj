(ns hodur-visualizer-schema.main
  (:require [figwheel.main.api :as fig]))

(defn -main [main]
  (fig/start {:id "dev"
              :options {:main main
                        :output-to "target/public/cljs-out/main.js"}
              :config {:watch-dirs ["src"]}}))
