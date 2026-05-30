/**
 * Sinap Bill — Facturama CFDI 4.0 Service Layer
 * 
 * Handles all CFDI 4.0 operations via the Facturama API.
 * Supports sandbox mode for development and production mode for real timbrado.
 * 
 * SAT Catalogs included for:
 * - Forma de Pago (c_FormaPago)
 * - Metodo de Pago (c_MetodoPago)
 * - Uso CFDI (c_UsoCFDI)
 * - Regimen Fiscal (c_RegimenFiscal)
 * - Tipo de Comprobante
 * 
 * @see https://www.api.facturama.com.mx/docs
 */

// ─── SAT CATALOGS ────────────────────────────────────────

export const FORMA_PAGO = [
  { code: '01', label: '01 - Efectivo' },
  { code: '03', label: '03 - Transferencia electronica de fondos' },
  { code: '04', label: '04 - Tarjeta de credito' },
  { code: '05', label: '05 - Monedero electronico' },
  { code: '06', label: '06 - Dinero electronico' },
  { code: '08', label: '08 - Vales de despensa' },
  { code: '12', label: '12 - Dacion en pago' },
  { code: '13', label: '13 - Pago por subrogacion' },
  { code: '14', label: '14 - Pago por consignacion' },
  { code: '15', label: '15 - Condonacion' },
  { code: '17', label: '17 - Compensacion' },
  { code: '23', label: '23 - Novacion' },
  { code: '24', label: '24 - Confusion' },
  { code: '25', label: '25 - Remision de deuda' },
  { code: '26', label: '26 - Prescripcion o caducidad' },
  { code: '27', label: '27 - A satisfaccion del acreedor' },
  { code: '28', label: '28 - Tarjeta de debito' },
  { code: '29', label: '29 - Tarjeta de servicios' },
  { code: '30', label: '30 - Aplicacion de anticipos' },
  { code: '31', label: '31 - Intermediario pagos' },
  { code: '99', label: '99 - Por definir' },
] as const

export const METODO_PAGO = [
  { code: 'PUE', label: 'PUE - Pago en una sola exhibicion' },
  { code: 'PPD', label: 'PPD - Pago en parcialidades o diferido' },
] as const

export const USO_CFDI = [
  { code: 'G01', label: 'G01 - Adquisicion de mercancias' },
  { code: 'G02', label: 'G02 - Devolucion, descuento o bonificacion' },
  { code: 'G03', label: 'G03 - Gastos en general' },
  { code: 'I01', label: 'I01 - Construcciones' },
  { code: 'I02', label: 'I02 - Mobiliario y equipo de oficina por inversiones' },
  { code: 'I03', label: 'I03 - Equipo de transporte' },
  { code: 'I04', label: 'I04 - Equipo de computo y accesorios' },
  { code: 'I05', label: 'I05 - Dados, troqueles, moldes, matrices y herramental' },
  { code: 'I06', label: 'I06 - Comunicaciones telefonicas' },
  { code: 'I07', label: 'I07 - Comunicaciones satelitales' },
  { code: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { code: 'D01', label: 'D01 - Honorarios medicos, dentales y gastos hospitalarios' },
  { code: 'D02', label: 'D02 - Gastos medicos por incapacidad' },
  { code: 'D03', label: 'D03 - Gastos funerales' },
  { code: 'D04', label: 'D04 - Donativos' },
  { code: 'D05', label: 'D05 - Intereses reales efectivamente pagados por creditos hipotecarios' },
  { code: 'D06', label: 'D06 - Aportaciones voluntarias al SAR' },
  { code: 'D07', label: 'D07 - Primas por seguros de gastos medicos' },
  { code: 'D08', label: 'D08 - Gastos de transportacion escolar obligatoria' },
  { code: 'D09', label: 'D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { code: 'D10', label: 'D10 - Pagos por servicios educativos (colegiaturas)' },
  { code: 'P01', label: 'P01 - Por definir' },
  { code: 'CP01', label: 'CP01 - Pagos con tarjeta de credito' },
  { code: 'CP02', label: 'CP02 - Pagos con tarjeta de debito' },
  { code: 'CP03', label: 'CP03 - Pagos con monedero electronico' },
  { code: 'CP04', label: 'CP04 - Pagos con dinero electronico' },
  { code: 'CP05', label: 'CP05 - Pagos con vales de despensa' },
] as const

export const REGIMEN_FISCAL = [
  { code: '601', label: '601 - General de Ley Personas Morales' },
  { code: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { code: '605', label: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', label: '606 - Arrendamiento' },
  { code: '607', label: '607 - Regimen de Enajenacion o Adquisicion de Bienes Inmuebles' },
  { code: '608', label: '608 - Demas ingresos' },
  { code: '609', label: '609 - Consolidacion' },
  { code: '610', label: '610 - Residentes en el Extranjero sin Establecimiento Permanente en Mexico' },
  { code: '611', label: '611 - Ingresos por Dividendos (socios y accionistas)' },
  { code: '612', label: '612 - Personas Fisicas con Actividad Empresarial y Profesional' },
  { code: '614', label: '614 - Ingresos por intereses' },
  { code: '615', label: '615 - Regimen de los ingresos por obtencion de premios' },
  { code: '616', label: '616 - Sin obligaciones fiscales' },
  { code: '620', label: '620 - Sociedades Cooperativas de Produccion que optan por diferir sus ingresos' },
  { code: '621', label: '621 - Incorporacion Fiscal' },
  { code: '622', label: '622 - Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras' },
  { code: '623', label: '623 - Opcional para Grupos de Sociedades' },
  { code: '624', label: '624 - Coordinados' },
  { code: '625', label: '625 - Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas' },
  { code: '626', label: '626 - Regimen Simplificado de Confianza' },
  { code: '629', label: '629 - De los Regimenes Fiscales y Fondos de Inversion' },
  { code: '630', label: '630 - Enajenacion de acciones en bolsa de valores' },
] as const

// Most common for health professionals
export const REGIMEN_FISCAL_COMMON = [
  { code: '612', label: '612 - Actividad Empresarial y Profesional' },
  { code: '626', label: '626 - Regimen Simplificado de Confianza' },
  { code: '601', label: '601 - General de Ley Personas Morales' },
  { code: '621', label: '621 - Incorporacion Fiscal' },
] as const

// ─── TYPES ───────────────────────────────────────────────

export interface CFDIItem {
  productCode: string   // SAT clave de producto/servicio
  identificationNumber?: string
  name: string          // Description
  quantity: number
  unitCode: string      // SAT clave de unidad
  unit: string          // Unit name
  unitPrice: number
  subtotal: number
  discount?: number
  taxBase?: number
  taxRate?: number      // 0.16 for IVA
  taxAmount?: number
  total: number
}

export interface CFDIReceiver {
  rfc: string
  name: string
  fiscalRegime?: string
  taxZipCode?: string  // Codigo postal fiscal
  useCfdi: string
}

export interface CFDIEmisor {
  rfc: string
  name: string
  fiscalRegime: string
  taxZipCode: string
}

export interface CFDIPayload {
  clinicId: string
  emisor: CFDIEmisor
  receptor: CFDIReceiver
  items: CFDIItem[]
  formaPago: string
  metodoPago: string
  tipoComprobante: string  // "I" = Ingreso, "E" = Egreso
  moneda: string           // "MXN"
  exportacion: string      // "01" = No aplica
  lugarExpedicion: string  // Codigo postal
  serie?: string
  folio?: string
  paymentConditions?: string
  // Related documents for cancellation
  relatedCfdi?: {
    uuid: string
    relationshipType: string // "01" = Nota de credito, "04" = Sustituye
  }
}

export interface CFDIResponse {
  success: boolean
  cfdiUuid?: string
  total?: number
  subtotal?: number
  iva?: number
  isSimulated?: boolean
  facturamaId?: string
  pdfUrl?: string
  xmlUrl?: string
  fechaTimbrado?: string
  errorMessage?: string
}

export interface CFDICancelResponse {
  success: boolean
  isSimulated?: boolean
  errorMessage?: string
}

// ─── FACTURAMA API SERVICE ──────────────────────────────

const FACTURAMA_SANDBOX_URL = 'https://apisandbox.facturama.com.mx'
const FACTURAMA_PRODUCTION_URL = 'https://api.facturama.com.mx'

function getFacturamaUrl(isSandbox: boolean): string {
  return isSandbox ? FACTURAMA_SANDBOX_URL : FACTURAMA_PRODUCTION_URL
}

function getAuthHeader(userId: string, token: string): string {
  return 'Basic ' + Buffer.from(`${userId}:${token}`).toString('base64')
}

/**
 * Generate a CFDI 4.0 invoice via Facturama API
 */
export async function generateCFDI(payload: CFDIPayload, config: {
  facturamaUserId: string
  facturamaToken: string
  isSandbox: boolean
}): Promise<CFDIResponse> {
  const url = getFacturamaUrl(config.isSandbox)
  const authHeader = getAuthHeader(config.facturamaUserId, config.facturamaToken)

  // Build Facturama-compatible request body
  const facturamaBody = {
    Receipt: {
      Issuer: {
        FiscalRegime: payload.emisor.fiscalRegime,
        Rfc: payload.emisor.rfc,
        Name: payload.emisor.name,
        TaxZipCode: payload.emisor.taxZipCode,
      },
      Receiver: {
        Rfc: payload.receptor.rfc,
        Name: payload.receptor.name,
        CfdiUse: payload.receptor.useCfdi,
        FiscalRegime: payload.receptor.fiscalRegime || '616',
        TaxZipCode: payload.receptor.taxZipCode || payload.emisor.taxZipCode,
      },
      Items: payload.items.map(item => ({
        ProductCode: item.productCode,
        IdentificationNumber: item.identificationNumber,
        Name: item.name,
        Quantity: item.quantity,
        UnitCode: item.unitCode,
        Unit: item.unit,
        UnitPrice: item.unitPrice,
        Subtotal: item.subtotal,
        Discount: item.discount || 0,
        TaxBase: item.taxBase || item.subtotal,
        TaxRate: item.taxRate || 0.16,
        TaxAmount: item.taxAmount || (item.subtotal * 0.16),
        Total: item.total || (item.subtotal * 1.16),
      })),
      NameId: '1',  // Operación
      Date: new Date().toISOString(),
      PaymentForm: payload.formaPago,
      PaymentMethod: payload.metodoPago,
      VoucherType: payload.tipoComprobante,
      Currency: payload.moneda,
      Export: payload.exportacion,
      ExpeditionPlace: payload.lugarExpedicion,
      Serie: payload.serie || 'A',
      Folio: payload.folio,
      PaymentConditions: payload.paymentConditions,
      CfdiRelationType: payload.relatedCfdi?.relationshipType,
    },
  }

  try {
    const response = await fetch(`${url}/api-lite/2/cfdis`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(facturamaBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        errorMessage: errorData.Message || errorData.message || `Error HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      cfdiUuid: data.Complement?.TaxStamp?.Uuid || data.uuid,
      total: data.Receipt?.Items?.reduce((sum: number, i: any) => sum + (i.Total || 0), 0) || 0,
      subtotal: data.Receipt?.Items?.reduce((sum: number, i: any) => sum + (i.Subtotal || 0), 0) || 0,
      iva: data.Receipt?.Items?.reduce((sum: number, i: any) => sum + (i.TaxAmount || 0), 0) || 0,
      isSimulated: false,
      facturamaId: data.Id || data.id,
      fechaTimbrado: data.Complement?.TaxStamp?.Date,
    }
  } catch (error: any) {
    return {
      success: false,
      errorMessage: error.message || 'Error de conexion con Facturama',
    }
  }
}

/**
 * Cancel a CFDI 4.0 invoice via Facturama API
 */
export async function cancelCFDI(
  cfdiUuid: string,
  motive: string, // "01" = Comprobante emitido con errores con relacion, "02" = Emitido con errores sin relacion, "04" = Sustituye
  replacementUuid?: string, // Required if motive is "01"
  config: {
    facturamaUserId: string
    facturamaToken: string
    isSandbox: boolean
  } = { facturamaUserId: '', facturamaToken: '', isSandbox: true }
): Promise<CFDICancelResponse> {
  const url = getFacturamaUrl(config.isSandbox)
  const authHeader = getAuthHeader(config.facturamaUserId, config.facturamaToken)

  const body: Record<string, string> = {
    uuid: cfdiUuid,
    motive,
  }
  if (replacementUuid) {
    body.substitutionUuid = replacementUuid
  }

  try {
    const response = await fetch(`${url}/api-lite/2/cfdis/${cfdiUuid}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        errorMessage: errorData.Message || `Error HTTP ${response.status}`,
      }
    }

    return { success: true, isSimulated: false }
  } catch (error: any) {
    return {
      success: false,
      errorMessage: error.message || 'Error de conexion con Facturama',
    }
  }
}

/**
 * Download CFDI PDF
 */
export async function downloadCFDIPDF(
  facturamaId: string,
  config: {
    facturamaUserId: string
    facturamaToken: string
    isSandbox: boolean
  }
): Promise<Blob | null> {
  const url = getFacturamaUrl(config.isSandbox)
  const authHeader = getAuthHeader(config.facturamaUserId, config.facturamaToken)

  try {
    const response = await fetch(`${url}/api-lite/2/cfdis/${facturamaId}/pdf`, {
      headers: { 'Authorization': authHeader },
    })
    if (!response.ok) return null
    return await response.blob()
  } catch {
    return null
  }
}

/**
 * Download CFDI XML
 */
export async function downloadCFDIXML(
  facturamaId: string,
  config: {
    facturamaUserId: string
    facturamaToken: string
    isSandbox: boolean
  }
): Promise<string | null> {
  const url = getFacturamaUrl(config.isSandbox)
  const authHeader = getAuthHeader(config.facturamaUserId, config.facturamaToken)

  try {
    const response = await fetch(`${url}/api-lite/2/cfdis/${facturamaId}/xml`, {
      headers: { 'Authorization': authHeader },
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

// ─── SIMULATION (SANDBOX) ────────────────────────────────

/**
 * Generate a simulated CFDI for sandbox/demo mode
 * Produces a realistic UUID and response structure
 */
export function generateSimulatedCFDI(payload: CFDIPayload): CFDIResponse {
  const subtotal = payload.items.reduce((sum, i) => sum + i.subtotal, 0)
  const iva = payload.items.reduce((sum, i) => sum + (i.taxAmount || i.subtotal * 0.16), 0)
  const total = subtotal + iva

  // Generate a realistic-looking UUID
  const uuid = 'sim-' + crypto.randomUUID()

  return {
    success: true,
    cfdiUuid: uuid,
    total: Math.round(total * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    isSimulated: true,
    facturamaId: `sim-${Date.now()}`,
    fechaTimbrado: new Date().toISOString(),
  }
}

/**
 * Simulate CFDI cancellation
 */
export function cancelSimulatedCFDI(): CFDICancelResponse {
  return {
    success: true,
    isSimulated: true,
  }
}

// ─── HEALTH SERVICE PRODUCT CODES ────────────────────────

// SAT Clave de Producto/Servicio for health services
export const HEALTH_PRODUCT_CODES = [
  { code: '851115', label: '851115 - Servicios medicos de consulta externa' },
  { code: '851116', label: '851116 - Servicios medicos de especialidades' },
  { code: '851117', label: '851117 - Servicios medicos de cirugia' },
  { code: '851118', label: '851118 - Servicios medicos de hospitalizacion' },
  { code: '851119', label: '851119 - Servicios medicos de urgencias' },
  { code: '851120', label: '851120 - Servicios medicos de diagnostico' },
  { code: '851121', label: '851121 - Servicios medicos de tratamiento' },
  { code: '851122', label: '851122 - Servicios medicos de rehabilitacion' },
  { code: '851123', label: '851123 - Servicios medicos de prevencion' },
  { code: '851124', label: '851124 - Servicios medicos de estetica' },
  { code: '851125', label: '851125 - Servicios medicos de dermatologia' },
  { code: '851126', label: '851126 - Servicios medicos de odontologia' },
  { code: '851916', label: '851916 - Otros servicios medicos' },
] as const

// SAT Clave de Unidad
export const UNIT_CODES = [
  { code: 'E48', label: 'E48 - Unidad de servicio' },
  { code: 'ACT', label: 'ACT - Actividad' },
  { code: 'HUR', label: 'HUR - Hora' },
  { code: 'MES', label: 'MES - Mes' },
  { code: 'A', label: 'A - Ano' },
  { code: 'DPC', label: 'DPC - Docena de piezas' },
] as const
