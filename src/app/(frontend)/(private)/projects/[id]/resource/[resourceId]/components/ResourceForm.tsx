'use client'

import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import { Button } from '@/components/ui/button'
import useVisualizadorStore from '@/stores/visualizador-store'
import { useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { updateResourceAction } from '@/actions/resources/updateResource'

export interface ResourceFormInitialValues {
  nombre_cliente: string
  nombre_documento: string
  caso: string | null
  tipo: string | null
  // Contenedor para campos del caso activo; se detallará en 5.3
  caseData?: Record<string, unknown>
}

interface ResourceFormProps {
  projectId: string
  resourceId: string
  initialValues: ResourceFormInitialValues
}

export default function ResourceForm({ projectId, resourceId, initialValues }: ResourceFormProps) {
  return (
    <Formik<ResourceFormInitialValues>
      initialValues={initialValues}
      validationSchema={Yup.object({
        nombre_cliente: Yup.string().max(200, 'Máximo 200 caracteres'),
        nombre_documento: Yup.string().max(200, 'Máximo 200 caracteres'),
        caso: Yup.string().nullable(),
        tipo: Yup.string().nullable(),
      })}
      enableReinitialize
      onSubmit={async (values, helpers) => {
        try {
          const updates: Record<string, unknown> = {
            nombre_cliente: values.nombre_cliente,
            nombre_documento: values.nombre_documento,
            caso: values.caso,
            tipo: values.tipo,
          }
          if (values.caso && values.caseData && typeof values.caseData === 'object') {
            updates[values.caso] = values.caseData
          }

          const result = await updateResourceAction(projectId, resourceId, updates)
          if (result.success) toast.success('Cambios guardados correctamente')
          else toast.error(result.error || 'No se pudieron guardar los cambios')
        } finally {
          helpers.setSubmitting(false)
        }
      }}
    >
      {({ isSubmitting, values, setFieldValue, dirty }) => (
        <Form className='flex h-full w-full flex-col gap-4'>
          <FormChangeWatcher dirty={dirty} />
          {/* Campos globales */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-1'>
              <label className='text-xs text-muted-foreground'>Nombre del cliente</label>
              <Field name='nombre_cliente'>
                {({ field }: any) => <Input {...field} placeholder='Nombre del cliente' />}
              </Field>
            </div>
            <div className='space-y-1'>
              <label className='text-xs text-muted-foreground'>Nombre del documento</label>
              <Field name='nombre_documento'>
                {({ field }: any) => <Input {...field} placeholder='Nombre del documento' />}
              </Field>
            </div>
            <div className='space-y-1'>
              <label className='text-xs text-muted-foreground'>Caso</label>
              <Select
                value={values.caso ?? ''}
                onValueChange={(v) => {
                  setFieldValue('caso', v || null)
                  // Reset de datos del caso al cambiar
                  setFieldValue('caseData', {})
                  // Reset de tipo si no corresponde
                  const allowed = getAllowedTiposForCaso(v)
                  if (values.tipo && !allowed.includes(values.tipo)) {
                    setFieldValue('tipo', null)
                  }
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Selecciona un caso' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='factura_suministros'>Factura de suministros</SelectItem>
                  <SelectItem value='desplazamientos'>Desplazamientos</SelectItem>
                  <SelectItem value='materias_primas'>Materias primas</SelectItem>
                  <SelectItem value='viajes_tipo_2'>Viajes tipo 2</SelectItem>
                  <SelectItem value='variado_emails'>Variado emails</SelectItem>
                  <SelectItem value='consumos_combustible_tipo_1'>
                    Consumos combustible tipo 1
                  </SelectItem>
                  <SelectItem value='residuos'>Residuos</SelectItem>
                  <SelectItem value='viajes_tipo_1'>Viajes tipo 1</SelectItem>
                  <SelectItem value='otros'>Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <label className='text-xs text-muted-foreground'>Tipo</label>
              <Select
                value={values.tipo ?? ''}
                onValueChange={(v) => setFieldValue('tipo', v || null)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Selecciona un tipo' />
                </SelectTrigger>
                <SelectContent>
                  {getTipoOptions(values.caso).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Render dinámico de campos por caso (5.3) */}
          <CaseFields caso={values.caso} values={values} setFieldValue={setFieldValue} />

          <div className='mt-auto flex items-center justify-end gap-2'>
            <Button type='submit' disabled={isSubmitting} size='sm'>
              Guardar
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}

// ------------------------------------------------------------------
// Campos por caso — versión inicial (mínima) basada en tipos conocidos
// ------------------------------------------------------------------

type SetField = (field: string, value: unknown) => void

function CaseFields({
  caso,
  values,
  setFieldValue,
}: {
  caso: string | null
  values: ResourceFormInitialValues
  setFieldValue: SetField
}) {
  if (!caso) {
    return (
      <div className='rounded-md border bg-card p-4 text-xs text-muted-foreground'>
        Selecciona un caso para ver sus campos específicos.
      </div>
    )
  }

  const data = (values.caseData || {}) as Record<string, unknown>
  const setCase = (key: string, val: unknown) => {
    setFieldValue('caseData', { ...data, [key]: val })
  }

  if (caso === 'factura_suministros') {
    return (
      <div className='rounded-md border bg-card p-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <InputRow
            label='Código de suministro (CUPS / agua)'
            placeholder='CUPS / código agua'
            value={(data.codigo_suministro as string) || ''}
            onChange={(v) => setCase('codigo_suministro', v)}
          />
          <div className='space-y-1'>
            <label className='text-xs text-muted-foreground'>Periodo de consumo</label>
            <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
              <Input
                type='date'
                value={((data.periodo_consumo as any)?.fecha_inicio as string) || ''}
                onChange={(e) =>
                  setCase('periodo_consumo', {
                    ...(data.periodo_consumo as Record<string, unknown>),
                    fecha_inicio: e.target.value,
                  })
                }
              />
              <Input
                type='date'
                value={((data.periodo_consumo as any)?.fecha_fin as string) || ''}
                onChange={(e) =>
                  setCase('periodo_consumo', {
                    ...(data.periodo_consumo as Record<string, unknown>),
                    fecha_fin: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <InputRow
            label='Fecha de compra (solo combustibles)'
            type='date'
            value={(data.fecha_compra as string) || ''}
            onChange={(v) => setCase('fecha_compra', v)}
          />
          <InputRow
            label='Volumen total consumido'
            type='number'
            value={toNumberString(data.volumen_consumido)}
            onChange={(v) => setCase('volumen_consumido', toNumberOrNull(v))}
          />
          <SelectRow
            label='Unidad de medida'
            value={(data.unidad_medida as string) || ''}
            onValueChange={(v) => setCase('unidad_medida', v)}
            options={['kWh', 'L', 'm3', 'kg', 'km'].map((v) => ({ label: v, value: v }))}
          />
          <InputRow
            label='Proveedor del servicio'
            value={(data.proveedor_servicio as string) || ''}
            onChange={(v) => setCase('proveedor_servicio', v)}
          />
          <InputRow
            label='Código de la factura'
            value={(data.codigo_factura as string) || ''}
            onChange={(v) => setCase('codigo_factura', v)}
          />
        </div>
      </div>
    )
  }

  if (caso === 'desplazamientos') {
    return (
      <div className='rounded-md border bg-card p-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <InputRow
            label='Fecha del servicio'
            type='date'
            value={(data.fecha_servicio as string) || ''}
            onChange={(v) => setCase('fecha_servicio', v)}
          />
          <SelectRow
            label='Empresa del servicio'
            value={(data.empresa_servicio as string) || ''}
            onValueChange={(v) => setCase('empresa_servicio', v)}
            options={['Uber', 'Cabify', 'Taxi', 'Bolt', 'Otra'].map((v) => ({
              label: v,
              value: v.toLowerCase(),
            }))}
          />
          <InputRow
            label='Importe'
            type='number'
            value={toNumberString(data.importe)}
            onChange={(v) => setCase('importe', toNumberOrNull(v))}
          />
          <SelectRow
            label='Moneda'
            value={(data.moneda as string) || ''}
            onValueChange={(v) => setCase('moneda', v)}
            options={['EUR', 'USD', 'GBP'].map((v) => ({ label: v, value: v }))}
          />
          <InputRow
            label='Cantidad consumida'
            type='number'
            value={toNumberString(data.cantidad_consumida)}
            onChange={(v) => setCase('cantidad_consumida', toNumberOrNull(v))}
          />
          <SelectRow
            label='Unidad de medida'
            value={(data.unidad_medida as string) || ''}
            onValueChange={(v) => setCase('unidad_medida', v)}
            options={['km', 'L'].map((v) => ({ label: v, value: v }))}
          />
          <SelectRow
            label='Tipo de combustible'
            value={(data.tipo_combustible as string) || ''}
            onValueChange={(v) => setCase('tipo_combustible', v)}
            options={['gasolina', 'diesel', 'GLP', 'NA'].map((v) => ({
              label: v.toUpperCase(),
              value: v,
            }))}
          />
          <InputRow
            label='Código de la factura'
            value={(data.codigo_factura as string) || ''}
            onChange={(v) => setCase('codigo_factura', v)}
          />
        </div>
      </div>
    )
  }

  if (caso === 'materias_primas') {
    return (
      <div className='rounded-md border bg-card p-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <InputRow
            label='Nombre del proveedor'
            value={(data.nombre_proveedor as string) || ''}
            onChange={(v) => setCase('nombre_proveedor', v)}
          />
          <InputRow
            label='Fecha de facturación'
            type='date'
            value={(data.fecha_factura as string) || ''}
            onChange={(v) => setCase('fecha_factura', v)}
          />
          <InputRow
            label='Código de la factura'
            value={(data.codigo_factura as string) || ''}
            onChange={(v) => setCase('codigo_factura', v)}
          />
          <InputRow
            label='Tipo de producto (item)'
            value={(data.tipo_producto as string) || ''}
            onChange={(v) => setCase('tipo_producto', v)}
          />
          <div className='space-y-1 md:col-span-2'>
            <label className='text-xs text-muted-foreground'>Descripción del producto</label>
            <Textarea
              rows={3}
              value={(data.descripcion_producto as string) || ''}
              onChange={(e) => setCase('descripcion_producto', e.target.value)}
            />
          </div>
          <InputRow
            label='Peso del producto (kg)'
            type='number'
            value={toNumberString(data.peso_kg)}
            onChange={(v) => setCase('peso_kg', toNumberOrNull(v))}
          />
          <InputRow
            label='Importe'
            type='number'
            value={toNumberString(data.importe)}
            onChange={(v) => setCase('importe', toNumberOrNull(v))}
          />
          <SelectRow
            label='Moneda'
            value={(data.moneda as string) || ''}
            onValueChange={(v) => setCase('moneda', v)}
            options={['EUR', 'USD', 'GBP'].map((v) => ({ label: v, value: v }))}
          />
        </div>
      </div>
    )
  }

  if (caso === 'viajes_tipo_2') {
    return <ViajesFields tipo='2' data={data} setCase={setCase} />
  }

  if (caso === 'viajes_tipo_1') {
    return <ViajesFields tipo='1' data={data} setCase={setCase} />
  }

  if (caso === 'variado_emails') {
    return (
      <div className='rounded-md border bg-card p-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <InputRow
            label='Remitente'
            value={(data.remitente as string) || ''}
            onChange={(v) => setCase('remitente', v)}
          />
          <InputRow
            label='Fecha'
            type='date'
            value={(data.fecha as string) || ''}
            onChange={(v) => setCase('fecha', v)}
          />
          <div className='space-y-1 md:col-span-2'>
            <label className='text-xs text-muted-foreground'>Descripción del consumo/dato</label>
            <Textarea
              rows={3}
              value={(data.descripcion_consumo as string) || ''}
              onChange={(e) => setCase('descripcion_consumo', e.target.value)}
            />
          </div>
          <InputRow
            label='Cantidad'
            type='number'
            value={toNumberString(data.cantidad)}
            onChange={(v) => setCase('cantidad', toNumberOrNull(v))}
          />
          <SelectRow
            label='Unidad de medida'
            value={(data.unidad_medida as string) || ''}
            onValueChange={(v) => setCase('unidad_medida', v)}
            options={['kWh', 'L', 'm3', 'kg', 'km', 'ud'].map((v) => ({ label: v, value: v }))}
          />
        </div>
      </div>
    )
  }

  if (caso === 'consumos_combustible_tipo_1') {
    return (
      <div className='rounded-md border bg-card p-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <InputRow
            label='Tarjeta de combustible o matrícula'
            value={(data.codigo_tarjeta_o_matricula as string) || ''}
            onChange={(v) => setCase('codigo_tarjeta_o_matricula', v)}
          />
          <InputRow
            label='Fecha de repostaje'
            type='date'
            value={(data.fecha_repostaje as string) || ''}
            onChange={(v) => setCase('fecha_repostaje', v)}
          />
          <InputRow
            label='Cantidad repostada'
            type='number'
            value={toNumberString(data.cantidad_combustible)}
            onChange={(v) => setCase('cantidad_combustible', toNumberOrNull(v))}
          />
          <SelectRow
            label='Unidad de medida'
            value={(data.unidad_medida as string) || ''}
            onValueChange={(v) => setCase('unidad_medida', v)}
            options={['L', 'kg', 'kWh'].map((v) => ({ label: v, value: v }))}
          />
          <SelectRow
            label='Tipo de combustible'
            value={(data.tipo_combustible as string) || ''}
            onValueChange={(v) => setCase('tipo_combustible', v)}
            options={['gasolina', 'diesel', 'GLP'].map((v) => ({
              label: v.toUpperCase(),
              value: v,
            }))}
          />
          <InputRow
            label='Importe'
            type='number'
            value={toNumberString(data.importe)}
            onChange={(v) => setCase('importe', toNumberOrNull(v))}
          />
          <SelectRow
            label='Moneda'
            value={(data.moneda as string) || ''}
            onValueChange={(v) => setCase('moneda', v)}
            options={['EUR', 'USD', 'GBP'].map((v) => ({ label: v, value: v }))}
          />
          <InputRow
            label='Nº de factura'
            value={(data.codigo_factura as string) || ''}
            onChange={(v) => setCase('codigo_factura', v)}
          />
        </div>
      </div>
    )
  }

  if (caso === 'residuos') {
    return (
      <div className='rounded-md border bg-card p-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <InputRow
            label='Código de recogida'
            value={(data.codigo_recogida as string) || ''}
            onChange={(v) => setCase('codigo_recogida', v)}
          />
          <InputRow
            label='Localización de la recogida'
            value={(data.localizacion_recogida as string) || ''}
            onChange={(v) => setCase('localizacion_recogida', v)}
          />
          <InputRow
            label='Fecha de recogida'
            type='date'
            value={(data.fecha_recogida as string) || ''}
            onChange={(v) => setCase('fecha_recogida', v)}
          />
          <SelectRow
            label='Tipo de residuo'
            value={(data.tipo_residuo as string) || ''}
            onValueChange={(v) => setCase('tipo_residuo', v)}
            options={['papel', 'plastico', 'organico', 'vidrio', 'mixto', 'peligroso', 'otro'].map(
              (v) => ({ label: v.charAt(0).toUpperCase() + v.slice(1), value: v }),
            )}
          />
          <InputRow
            label='Cantidad'
            type='number'
            value={toNumberString(data.cantidad_residuo)}
            onChange={(v) => setCase('cantidad_residuo', toNumberOrNull(v))}
          />
          <SelectRow
            label='Unidad'
            value={(data.unidad_medida as string) || ''}
            onValueChange={(v) => setCase('unidad_medida', v)}
            options={['kg', 't'].map((v) => ({ label: v, value: v }))}
          />
        </div>
      </div>
    )
  }

  // Caso 'otros' o no implementado: mostrar bloque genérico
  return (
    <div className='rounded-md border bg-card p-4 text-xs text-muted-foreground'>
      No hay campos específicos para este caso.
    </div>
  )
}

function FormChangeWatcher({ dirty }: { dirty: boolean }) {
  const setUnsavedChanges = useVisualizadorStore((s) => s.setUnsavedChanges)
  useEffect(() => {
    setUnsavedChanges(dirty)
  }, [dirty, setUnsavedChanges])

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
  return null
}

// ------------------- Utilidades UI -------------------

function InputRow({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className='space-y-1'>
      <label className='text-xs text-muted-foreground'>{label}</label>
      <Input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function SelectRow({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: string
  onValueChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <div className='space-y-1'>
      <label className='text-xs text-muted-foreground'>{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Selecciona una opción' />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ViajesFields({
  tipo,
  data,
  setCase,
}: {
  tipo: '1' | '2'
  data: Record<string, unknown>
  setCase: (key: string, value: unknown) => void
}) {
  const label = `Viajes realizados (tipo ${tipo})`
  const escalas = (data.escalas as { escala: string }[] | undefined) || []
  const setEscalas = (rows: { escala: string }[]) => setCase('escalas', rows)

  return (
    <div className='rounded-md border bg-card p-4'>
      <div className='mb-2 text-xs text-muted-foreground'>{label}</div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <InputRow
          label='Fecha del viaje'
          type='date'
          value={(data.fecha_viaje as string) || ''}
          onChange={(v) => setCase('fecha_viaje', v)}
        />
        <SelectRow
          label='Medio de transporte'
          value={(data.medio_transporte as string) || ''}
          onValueChange={(v) => setCase('medio_transporte', v)}
          options={['avion', 'tren', 'ferry', 'coche'].map((v) => ({
            label: v.toUpperCase(),
            value: v,
          }))}
        />
        <InputRow
          label='Origen (estación/aeropuerto)'
          value={(data.origen as string) || ''}
          onChange={(v) => setCase('origen', v)}
        />
        <InputRow
          label='Destino (estación/aeropuerto)'
          value={(data.destino as string) || ''}
          onChange={(v) => setCase('destino', v)}
        />

        {/* Escalas */}
        <div className='md:col-span-2 space-y-2'>
          <label className='text-xs text-muted-foreground'>Escalas</label>
          <div className='space-y-2'>
            {escalas.map((row, idx) => (
              <div key={idx} className='flex items-center gap-2'>
                <Input
                  value={row.escala}
                  placeholder='Código escala'
                  onChange={(e) => {
                    const copy = escalas.slice()
                    copy[idx] = { ...copy[idx], escala: e.target.value }
                    setEscalas(copy)
                  }}
                />
                <Button
                  type='button'
                  size='sm'
                  variant='secondary'
                  onClick={() => {
                    const copy = escalas.slice()
                    copy.splice(idx, 1)
                    setEscalas(copy)
                  }}
                >
                  Eliminar
                </Button>
              </div>
            ))}
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => setEscalas([...escalas, { escala: '' }])}
            >
              Añadir escala
            </Button>
          </div>
        </div>

        <InputRow
          label='Nº de personas'
          type='number'
          value={toNumberString(data.numero_personas)}
          onChange={(v) => setCase('numero_personas', toNumberOrNull(v))}
        />
        <SelectRow
          label='Categoría del billete'
          value={(data.categoria_billete as string) || ''}
          onValueChange={(v) => setCase('categoria_billete', v)}
          options={['turista', 'preferente', 'business', 'primera'].map((v) => ({
            label: v,
            value: v,
          }))}
        />
        <SelectRow
          label='Tipo de trayecto'
          value={(data.tipo_trayecto as string) || ''}
          onValueChange={(v) => setCase('tipo_trayecto', v)}
          options={[
            { label: 'Ida', value: 'ida' },
            { label: 'Ida y vuelta', value: 'ida_vuelta' },
          ]}
        />
        <InputRow
          label='Distancia (km)'
          type='number'
          value={toNumberString(data.distancia)}
          onChange={(v) => setCase('distancia', toNumberOrNull(v))}
        />
        <InputRow
          label='Fuente de la distancia'
          value={(data.fuente_distancia as string) || ''}
          onChange={(v) => setCase('fuente_distancia', v)}
        />
        <InputRow
          label='Código de la factura'
          value={(data.codigo_factura as string) || ''}
          onChange={(v) => setCase('codigo_factura', v)}
        />
      </div>
    </div>
  )
}

// ------------------- Utilidades de datos -------------------

function toNumberString(v: unknown): string {
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') return v
  return ''
}

function toNumberOrNull(v: string): number | null {
  if (v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

const allowedByCaso: Record<string, string[]> = {
  factura_suministros: ['electricidad', 'agua', 'gas', 'combustible'],
  desplazamientos: ['gasolinera', 'taxi_vtc'],
  otros: ['otros'],
}

function getAllowedTiposForCaso(caso: string | null): string[] {
  if (!caso) return ['prebuilt-invoice', 'prebuilt-receipt']
  return allowedByCaso[caso] || ['prebuilt-invoice', 'prebuilt-receipt']
}

function getTipoOptions(caso: string | null): { label: string; value: string }[] {
  const base = [
    { label: 'Factura (prebuilt)', value: 'prebuilt-invoice' },
    { label: 'Recibo (prebuilt)', value: 'prebuilt-receipt' },
  ]
  const extraMap: Record<string, { label: string; value: string }[]> = {
    factura_suministros: [
      { label: 'Electricidad', value: 'electricidad' },
      { label: 'Agua', value: 'agua' },
      { label: 'Gas', value: 'gas' },
      { label: 'Combustible para calefacción', value: 'combustible' },
    ],
    desplazamientos: [
      { label: 'Gasolinera', value: 'gasolinera' },
      { label: 'Taxi / VTC', value: 'taxi_vtc' },
    ],
    otros: [{ label: 'Otros', value: 'otros' }],
  }
  const allowed = getAllowedTiposForCaso(caso)
  const candidates = [...(extraMap[caso || ''] || base), ...base]
  // Filtrar duplicados por value respetando allowed
  const unique: Record<string, { label: string; value: string }> = {}
  for (const c of candidates) {
    if (!allowed.includes(c.value)) continue
    if (!unique[c.value]) unique[c.value] = c
  }
  return Object.values(unique)
}
