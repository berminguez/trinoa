'use client'

import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import { Button } from '@/components/ui/button'
import useVisualizadorStore from '@/stores/visualizador-store'
import { useEffect } from 'react'
import { Input } from '@/components/ui/input'
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
          const result = await updateResourceAction(projectId, resourceId, {
            nombre_cliente: values.nombre_cliente,
            nombre_documento: values.nombre_documento,
            caso: values.caso,
            tipo: values.tipo,
          })
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
                onValueChange={(v) => setFieldValue('caso', v || null)}
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
                  <SelectItem value='electricidad'>Electricidad</SelectItem>
                  <SelectItem value='agua'>Agua</SelectItem>
                  <SelectItem value='gas'>Gas</SelectItem>
                  <SelectItem value='combustible'>Combustible</SelectItem>
                  <SelectItem value='gasolinera'>Gasolinera</SelectItem>
                  <SelectItem value='taxi_vtc'>Taxi / VTC</SelectItem>
                  <SelectItem value='prebuilt-invoice'>Factura (prebuilt)</SelectItem>
                  <SelectItem value='prebuilt-receipt'>Recibo (prebuilt)</SelectItem>
                  <SelectItem value='otros'>Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Render dinámico de campos por caso (5.3) */}
          <CaseFields caso={values.caso} />

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

function CaseFields({ caso }: { caso: string | null }) {
  if (!caso) {
    return (
      <div className='rounded-md border bg-card p-4 text-xs text-muted-foreground'>
        Selecciona un caso para ver sus campos específicos.
      </div>
    )
  }

  // De momento solo mostramos un placeholder por caso; se expandirá en siguientes ediciones
  const labelMap: Record<string, string> = {
    factura_suministros: 'Factura de suministros',
    desplazamientos: 'Desplazamientos',
    materias_primas: 'Materias primas',
    viajes_tipo_2: 'Viajes tipo 2',
    variado_emails: 'Variado de emails',
    consumos_combustible_tipo_1: 'Consumos combustible tipo 1',
    residuos: 'Residuos',
    viajes_tipo_1: 'Viajes tipo 1',
    otros: 'Otros',
  }

  return (
    <div className='rounded-md border bg-card p-4 text-xs text-muted-foreground'>
      Campos para: {labelMap[caso] ?? caso} (implementación detallada pendiente)
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
