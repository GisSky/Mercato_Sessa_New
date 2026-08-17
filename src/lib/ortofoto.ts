const wmsUrl = import.meta.env.VITE_WMS_ORTOFOTO_URL as string | undefined
const wmsLayer = import.meta.env.VITE_WMS_ORTOFOTO_LAYER as string | undefined

export const isOrtofotoConfigured = Boolean(wmsUrl && wmsLayer)

export const ortofotoConfig = {
  url: wmsUrl ?? '',
  layer: wmsLayer ?? '',
  attribution:
    (import.meta.env.VITE_WMS_ORTOFOTO_ATTRIBUTION as string | undefined) || 'Ortofoto',
}

const esriUrl = import.meta.env.VITE_ESRI_ORTOFOTO_URL as string | undefined

export const isEsriOrtofotoConfigured = Boolean(esriUrl)

export const esriOrtofotoConfig = {
  url: esriUrl ?? '',
  attribution:
    (import.meta.env.VITE_ESRI_ORTOFOTO_ATTRIBUTION as string | undefined) || 'Ortofoto',
}
