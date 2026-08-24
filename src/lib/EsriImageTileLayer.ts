import L from 'leaflet'

/**
 * Layer di tile per un ArcGIS ImageServer (operazione exportImage), usato per le
 * ortofoto regionali che non espongono un servizio WMS standard. Ricalca lo stesso
 * meccanismo di L.TileLayer.WMS: per ogni tile calcola il bbox in EPSG:3857 e lo
 * passa come parametro alla richiesta.
 */
export class EsriImageTileLayer extends L.TileLayer {
  override getTileUrl(coords: L.Coords) {
    const tileLayer = this as unknown as {
      _tileCoordsToNwSe: (c: L.Coords) => [L.LatLng, L.LatLng]
      _url: string
    }
    const [nw, se] = tileLayer._tileCoordsToNwSe(coords)
    const min = L.CRS.EPSG3857.project(nw)
    const max = L.CRS.EPSG3857.project(se)
    const size = this.getTileSize()
    const params = new URLSearchParams({
      bbox: [min.x, max.y, max.x, min.y].join(','),
      bboxSR: '102100',
      imageSR: '102100',
      size: `${size.x},${size.y}`,
      format: 'png',
      transparent: 'true',
      f: 'image',
    })
    const base = tileLayer._url.replace(/\/$/, '')
    return `${base}/exportImage?${params.toString()}`
  }
}
