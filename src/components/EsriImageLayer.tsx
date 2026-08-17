import { createElementObject, createTileLayerComponent, updateGridLayer, withPane } from '@react-leaflet/core'
import type { GridLayer } from 'leaflet'
import { EsriImageTileLayer } from '../lib/EsriImageTileLayer'

interface EsriImageLayerProps {
  url: string
  attribution?: string
}

const EsriImageLayer = createTileLayerComponent<GridLayer, EsriImageLayerProps>(
  function createEsriImageLayer({ url, ...options }, context) {
    const layer = new EsriImageTileLayer(url, withPane(options, context))
    return createElementObject(layer, context)
  },
  function updateEsriImageLayer(layer, props, prevProps) {
    updateGridLayer(layer, props, prevProps)
  },
)

export default EsriImageLayer
