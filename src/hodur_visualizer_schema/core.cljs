(ns hodur-visualizer-schema.core
  (:require [datascript.core :as d]
            [clojure.string :as string]))

(defn ^:private cardinality-edge-label
  [[from to]]
  (if (= from to) from (str from ".." to)))

(defn ^:private parse-param-edge
  [{:keys [param/name] :as param}]
  (let [src (-> param :param/parent :field/parent)
        dst (-> param :param/type)
        is-user-dst? (= :user (-> param :param/type :type/nature))]
    (when (and src dst is-user-dst?)
      {:from (-> src :type/name)
       :to (-> dst :type/name)
       :text (str (-> param :param/parent :field/name) ", " name)
       :toArrow "OpenTriangle"
       :strokeDashArray [3 3]})))

(defn ^:private parse-params-edges
  [params]
  (reduce (fn [c p]
            (if-let [parsed-param (parse-param-edge p)]
              (conj c parsed-param)
              c))
          [] params))

(defn ^:private parse-field-edge
  [{:keys [field/name field/cardinality param/_parent] :as field}]
  (let [src (-> field :field/parent)
        dst (-> field :field/type)
        is-user-dst? (= :user (-> field :field/type :type/nature))]
    (when (and src dst is-user-dst?)
      {:from (-> src :type/name)
       :to (-> dst :type/name)
       :text name
       :toText (cardinality-edge-label cardinality)
       :toArrow "OpenTriangle"})))

(defn ^:private parse-type-edges
  [{:keys [field/_parent] :as t}]
  (reduce (fn [c {:keys [param/_parent] :as field}]
            (let [parsed-field (parse-field-edge field)
                  parsed-params (parse-params-edges _parent)]
              (cond-> c
                parsed-field (conj parsed-field)
                parsed-params (concat parsed-params))))
          [] _parent))

(defn ^:private parse-implements-edge
  [src dst]
  {:from (-> src :type/name)
   :to (-> dst :type/name)
   :toArrow "Triangle"})

(defn ^:private parse-implements-edges
  [{:keys [type/implements] :as t}]
  (reduce (fn [c i]
            (conj c (parse-implements-edge t i)))
          [] implements))

(defn ^:private parse-union-edge
  [src field]
  {:from (-> src :type/name)
   :to (-> field :field/name)
   :toArrow "OpenTriangle"
   :strokeDashArray [10 5]})

(defn ^:private parse-union-edges
  [{:keys [type/union field/_parent] :as t}]
  (when union
    (reduce (fn [c f]
              (conj c (parse-union-edge t f)))
            [] _parent)))

(defn ^:private parse-edges
  [types]
  (reduce (fn [c t]
            (concat c
                    (parse-type-edges t)
                    (parse-implements-edges t)
                    (parse-union-edges t)))
          "" types))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn ^:private cardinality-label
  [[from to]]
  (if (= from to)
    (if (= from 1) "" (str "[" from "]"))
    (str "[" from ".." to "]")))

(defn ^:private optional-label
  [optional]
  (if optional "?" ""))

(defn  ^:private type-label [{:keys [type/name] :as t} cardinality optional]
  (if name
    (str ": " name (cardinality-label cardinality) (optional-label optional))
    (if optional
      (str ": " (optional-label optional))
      "")))

(defn ^:private param-label
  [{:keys [param/name
           param/type
           param/cardinality
           param/optional]}]
  (str name (type-label type cardinality optional)))

(defn ^:private params-label
  [params]
  (if (not (empty? params))
    (str "("
         (->> params
              (map param-label)
              (string/join ", "))
         ")")
    ""))

(defn ^:private field-label
  [{:keys [field/name field/type
           field/cardinality
           field/optional
           param/_parent] :as field}]
  (str name
       (params-label _parent)
       (type-label type cardinality optional)))

(defn ^:private tags
  [e]
  (reduce-kv (fn [c k v]
               (let [n (namespace k)]
                 (if (not (or (= "type" n)
                              (= "field" n)
                              (= "param" n)
                              (= "db" n)))
                   (conj c {:key (str k)
                            :value v})
                   c)))
             [] e))

(defn ^:private parse-field
  [{:keys [field/name] :as field}]
  {:name (field-label field)
   :figure "Decision"
   :color "yellow"
   :tags (tags field)})

(defn ^:private parse-fields
  [fields]
  (reduce (fn [c f]
            (conj c (parse-field f)))
          [] fields))

(defn ^:private node-qualifier
  [{:keys [type/enum type/interface type/union] :as t}]
  (cond
    interface "<<interface>>"
    enum      "<<enum>>"
    union     "<<union>>"
    :else     ""))

(defn ^:private name-row
  [{:keys [type/enum type/interface type/union] :as t}]
  (if (or enum interface union) 1 0))

(defn ^:private parse-node
  [{:keys [type/name field/_parent] :as t}]
  {:qualifier (node-qualifier t)
   :key name
   :nameRow (name-row t)
   :fieldsRow (inc (name-row t))
   :items (parse-fields _parent)
   :tags (tags t)})

(defn ^:private parse-nodes
  [types]
  (reduce (fn [c t]
            (conj c (parse-node t)))
          [] types))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn ^:private meta-query []
  '[:find [(pull ?e [{:type/implements [*]}
                     {:field/_parent
                      [{:field/type [*]}
                       {:field/parent [*]}
                       {:param/_parent
                        [{:param/type [*]}
                         {:param/parent
                          [{:field/parent [*]} *]}
                         *]}
                       *]}
                     *]) ...]
    :where
    [?e :type/name]
    [?e :type/nature :user]])

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;; Public functions
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(defn schema [conn]
  (let [types (d/q (meta-query) @conn)]
    {:nodes (clj->js (parse-nodes types))
     :links (clj->js (parse-edges types))}))
