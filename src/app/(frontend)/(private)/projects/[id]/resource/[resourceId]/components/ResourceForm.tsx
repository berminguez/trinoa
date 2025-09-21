'use client'

import { Formik, Form } from 'formik'
import * as Yup from 'yup'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import useVisualizadorStore from '@/stores/visualizador-store'
import { useEffect, useState } from 'react'
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
import { rescanResourceAction } from '@/actions/resources/rescanResource'
import { cancelProcessingResourceAction } from '@/actions/resources/cancelProcessingResource'
import { getResourceStatusAction } from '@/actions/resources/getResourceStatus'
import { verifyResourceAction } from '@/actions/resources/verifyResource'
import { canBeVerified, getConfidenceThreshold } from '@/lib/utils/calculateResourceConfidence'
import { useRouter } from 'next/navigation'
import AnalyzeFieldsPanel from './AnalyzeFieldsPanel'
import useResourceVerificationStore from '@/stores/resource-verification-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DocumentStatusControl } from '@/components/ui/document-status-control'

export interface ResourceFormInitialValues {
  nombre_cliente: string
  caso: string | null
  tipo: string | null
  // Contenedor para campos del caso activo; se detallará en 5.3
  caseData?: Record<string, unknown>
  analyzeFields?: Record<string, any>
}

interface ResourceFormProps {
  projectId: string
  resourceId: string
  initialValues: ResourceFormInitialValues
  initialStatus?: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'needs_review'
  initialConfidence?: 'empty' | 'needs_revision' | 'trusted' | 'verified' | null
  initialDocumentoErroneo?: boolean | null
}

export default function ResourceForm({
  projectId,
  resourceId,
  initialValues,
  initialStatus,
  initialConfidence,
  initialDocumentoErroneo,
}: ResourceFormProps) {
  const t = useTranslations('documents.edit')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const isProcessing = useVisualizadorStore((s) => s.isProcessing)
  const setIsProcessing = useVisualizadorStore((s) => s.setIsProcessing)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [documentoErroneo, setDocumentoErroneo] = useState(Boolean(initialDocumentoErroneo))
  const [verifyPopoverOpen, setVerifyPopoverOpen] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [currentConfidence, setCurrentConfidence] = useState(initialConfidence)
  const [isCancelling, setIsCancelling] = useState(false)

  // Estado reactivo de verificación desde el store
  const canVerify = useResourceVerificationStore((s) => s.verificationStatus[resourceId] || false)
  const checkCanVerify = useResourceVerificationStore((s) => s.checkCanVerify)
  const clearResource = useResourceVerificationStore((s) => s.clearResource)

  // Establecer estado inicial
  useEffect(() => {
    if (initialStatus === 'processing') setIsProcessing(true)
  }, [initialStatus, setIsProcessing])

  // Verificar si el recurso puede ser verificado al montar y cuando cambien las condiciones
  useEffect(() => {
    // Solo verificar si no está procesando y no es documento erróneo
    if (!isProcessing && !documentoErroneo && currentConfidence !== 'verified') {
      checkCanVerify(resourceId)
    }
  }, [resourceId, isProcessing, documentoErroneo, currentConfidence, checkCanVerify])

  // Limpiar estado del store cuando el componente se desmonte
  useEffect(() => {
    return () => {
      clearResource(resourceId)
    }
  }, [resourceId, clearResource])

  // Función para manejar el cambio del estado de documento erróneo
  const handleDocumentoErroneoChange = async (checked: boolean) => {
    try {
      const result = await updateResourceAction(projectId, resourceId, {
        documentoErroneo: checked,
      })
      if (result.success) {
        setDocumentoErroneo(checked)
        toast.success(checked ? t('documentMarkedAsWrong') : t('documentWrongMarkRemoved'))
      } else {
        toast.error(result.error || t('couldNotUpdateDocumentStatus'))
      }
    } catch (error) {
      toast.error(t('documentUpdateError'))
    }
  }

  // Función para manejar la verificación del recurso
  const handleVerifyResource = async () => {
    try {
      setIsVerifying(true)
      const result = await verifyResourceAction(projectId, resourceId)

      if (result.success) {
        // Actualizar estado local inmediatamente
        setCurrentConfidence('verified')
        setVerifyPopoverOpen(false)

        // Limpiar estado de verificación del store ya que el recurso está verificado
        clearResource(resourceId)

        toast.success(t('documentVerifiedSuccessfully'))

        // Refrescar datos del servidor sin recargar la página
        router.refresh()
      } else {
        toast.error(result.error || t('couldNotVerifyDocument'))
      }
    } catch (error) {
      toast.error(t('documentVerificationError'))
    } finally {
      setIsVerifying(false)
    }
  }

  // Función para manejar la cancelación del procesamiento
  const handleCancelProcessing = async () => {
    try {
      setIsCancelling(true)
      const result = await cancelProcessingResourceAction(projectId, resourceId)

      if (result.success) {
        toast.success(t('processingCancelled'))

        // Refrescar la página para mostrar el nuevo estado
        router.refresh()
      } else {
        toast.error(result.error || t('processingCancelError'))
      }
    } catch (error) {
      toast.error(t('processingCancelError'))
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <Formik<ResourceFormInitialValues>
      initialValues={initialValues}
      validationSchema={Yup.object({
        nombre_cliente: Yup.string().max(200, t('maxCharacters', { count: 200 })),
        caso: Yup.string().nullable(),
        tipo: Yup.string().nullable(),
      })}
      enableReinitialize
      onSubmit={async (values, helpers) => {
        try {
          const updates: Record<string, unknown> = {
            caso: values.caso,
            tipo: values.tipo,
          }
          if (values.caso && values.caseData && typeof values.caseData === 'object') {
            updates[values.caso] = values.caseData
          }

          const result = await updateResourceAction(projectId, resourceId, updates)
          if (result.success) toast.success(t('changesSavedSuccessfully'))
          else toast.error(result.error || t('couldNotSaveChanges'))
        } finally {
          helpers.setSubmitting(false)
        }
      }}
    >
      {({ isSubmitting, values, setFieldValue, dirty, setValues }) => (
        <Form className='flex h-full w-full flex-col gap-4'>
          <div className='flex items-center justify-between'>
            <div className='text-xs text-muted-foreground'>{t('metadataEdit')}</div>
            {initialStatus === 'processing' ? (
              // Botón para cancelar procesamiento cuando está en processing
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button type='button' size='sm' variant='destructive' disabled={isCancelling}>
                    {isCancelling ? t('cancelling') : t('cancelProcessing')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('cancelProcessingConfirm')}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <div className='py-4'>
                    <p className='text-sm text-muted-foreground'>
                      {t('cancelProcessingDescription')}
                    </p>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setConfirmOpen(false)
                        await handleCancelProcessing()
                      }}
                      className='bg-destructive text-white hover:bg-destructive/90'
                    >
                      {t('cancelProcessingAction')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              // Botón de rescan para otros estados
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button type='button' size='sm' variant='outline' disabled={isProcessing}>
                    {t('rescan')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('rescanConfirm')}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          setIsProcessing(true)
                          setConfirmOpen(false)
                          const res = await rescanResourceAction(projectId, resourceId, {
                            caso: values.caso ?? undefined,
                            tipo: values.tipo ?? undefined,
                          })
                          if (!res.success) {
                            setIsProcessing(false)
                            toast.error(res.error || t('rescanStartError'))
                          } else {
                            toast.success(t('rescanStarted'))
                          }
                        } catch (_e) {
                          setIsProcessing(false)
                          toast.error(t('rescanStartError'))
                        }
                      }}
                    >
                      {tCommon('confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <FormChangeWatcher dirty={dirty} />
          {/* Campos globales */}
          <fieldset disabled={isProcessing} className='contents'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-1'>
                <label className='text-xs text-muted-foreground'>{t('case')}</label>
                <Select
                  value={values.caso ?? ''}
                  onValueChange={async (v) => {
                    setFieldValue('caso', v || null)
                    setFieldValue('caseData', {})
                    const allowed = getAllowedTiposForCaso(v)
                    if (values.tipo && !allowed.includes(values.tipo)) {
                      setFieldValue('tipo', null)
                    }
                    // guardar cambio inmediato
                    await updateResourceAction(projectId, resourceId, {
                      caso: v || null,
                      tipo: values.tipo ?? null,
                    })
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t('selectCase')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='factura_suministros'>
                      {t('caseLabels.factura_suministros')}
                    </SelectItem>
                    <SelectItem value='desplazamientos'>
                      {t('caseLabels.desplazamientos')}
                    </SelectItem>
                    <SelectItem value='materias_primas'>
                      {t('caseLabels.materias_primas')}
                    </SelectItem>
                    <SelectItem value='viajes_tipo_2'>{t('caseLabels.viajes_tipo_2')}</SelectItem>
                    <SelectItem value='variado_emails'>{t('caseLabels.variado_emails')}</SelectItem>
                    <SelectItem value='consumos_combustible_tipo_1'>
                      {t('caseLabels.consumos_combustible_tipo_1')}
                    </SelectItem>
                    <SelectItem value='residuos'>{t('caseLabels.residuos')}</SelectItem>
                    <SelectItem value='viajes_tipo_1'>{t('caseLabels.viajes_tipo_1')}</SelectItem>
                    <SelectItem value='otros'>{t('caseLabels.otros')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1'>
                <label className='text-xs text-muted-foreground'>{t('type')}</label>
                <Select
                  value={values.tipo ?? ''}
                  onValueChange={async (v) => {
                    setFieldValue('tipo', v || null)
                    await updateResourceAction(projectId, resourceId, {
                      caso: values.caso ?? null,
                      tipo: v || null,
                    })
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t('selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {getTipoOptions(values.caso).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(`typeLabels.${opt.value}`, { default: opt.label })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sin campos antiguos; solo caso y tipo */}

            {/* Control de estado del documento */}
            <div className='border-t pt-4'>
              <DocumentStatusControl
                confidence={initialConfidence}
                documentoErroneo={documentoErroneo}
                onDocumentoErroneoChange={handleDocumentoErroneoChange}
                showConfidenceBadge={false}
                showTooltip={true}
                disabled={isProcessing}
              />
            </div>

            {/* Editor simple de analyzeResult.fields */}
            <AnalyzeFieldsPanel
              key={String(isProcessing)}
              projectId={projectId}
              resourceId={resourceId}
            />

            {/* Botón de verificación */}
            {currentConfidence !== 'verified' && !documentoErroneo && (
              <div className='border-t pt-4'>
                <div className='flex flex-col gap-3'>
                  <div className='text-sm font-medium'>{t('documentVerification')}</div>

                  {!canVerify && (
                    <div className='text-xs text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200'>
                      {t('modifyFieldsToVerify')}
                    </div>
                  )}

                  <Popover open={verifyPopoverOpen} onOpenChange={setVerifyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type='button'
                        variant='default'
                        disabled={!canVerify || isProcessing || isVerifying}
                        className='w-fit'
                      >
                        {isVerifying ? t('verifying') : t('verifyDocument')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-96 p-6' align='center'>
                      <div className='space-y-4'>
                        <div className='space-y-2'>
                          <h4 className='font-medium text-base'>{t('confirmVerification')}</h4>
                          <p className='text-sm text-muted-foreground'>
                            {t('verificationConfirmText')}
                          </p>
                        </div>

                        <div className='flex justify-end space-x-2'>
                          <Button
                            type='button'
                            variant='outline'
                            onClick={() => setVerifyPopoverOpen(false)}
                            disabled={isVerifying}
                          >
                            {tCommon('cancel')}
                          </Button>
                          <Button
                            type='button'
                            onClick={handleVerifyResource}
                            disabled={isVerifying}
                          >
                            {isVerifying ? t('verifying') : t('verify')}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Sin botón de guardar, el guardado es automático */}
          </fieldset>

          {/* Polling cuando está en processing */}
          <PollingWatcher
            active={isProcessing}
            resourceId={resourceId}
            onDone={(updated: Record<string, unknown>) => {
              const u = updated as Record<string, unknown>
              const next: ResourceFormInitialValues = {
                nombre_cliente: typeof u.nombre_cliente === 'string' ? u.nombre_cliente : '',
                caso: typeof u.caso === 'string' ? u.caso : null,
                tipo: typeof u.tipo === 'string' ? u.tipo : null,
                caseData:
                  typeof u.caso === 'string' && u[u.caso]
                    ? (u[u.caso] as Record<string, unknown>)
                    : {},
              }
              setValues(next)
              setIsProcessing(false)
              toast.success(t('dataUpdatedAfterScan'))
            }}
          />
        </Form>
      )}
    </Formik>
  )
}

// ------------------------------------------------------------------
// Campos por caso — versión inicial (mínima) basada en tipos conocidos
// ------------------------------------------------------------------

type SetField = (field: string, value: unknown) => void

function _CaseFields({
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
        {/* Note: This function doesn't have access to t() directly, but it's rarely shown since the component is being refactored */}
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
                value={toDateInputString((data.periodo_consumo as any)?.fecha_inicio)}
                onChange={(e) =>
                  setCase('periodo_consumo', {
                    ...(data.periodo_consumo as Record<string, unknown>),
                    fecha_inicio: e.target.value,
                  })
                }
              />
              <Input
                type='date'
                value={toDateInputString((data.periodo_consumo as any)?.fecha_fin)}
                onChange={(e) =>
                  setCase('periodo_consumo', {
                    ...(data.periodo_consumo as Record<string, unknown>),
                    fecha_fin: e.target.value,
                  })
                }
              />
            </div>
          </div>
          {values.tipo === 'combustible' ? (
            <InputRow
              label='Fecha de compra (solo combustibles)'
              type='date'
              value={toDateInputString(data.fecha_compra)}
              onChange={(v) => setCase('fecha_compra', v)}
            />
          ) : null}
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
            value={toDateInputString(data.fecha_servicio)}
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
            value={toDateInputString(data.fecha_factura)}
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
            value={toDateInputString(data.fecha)}
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
            value={toDateInputString(data.fecha_repostaje)}
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
            value={toDateInputString(data.fecha_recogida)}
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
      {/* Note: This function doesn't have direct access to t(), but this text is rarely shown */}
      No hay campos específicos para este caso.
    </div>
  )
}

// Pequeño watcher para polling
function PollingWatcher({
  active,
  resourceId,
  onDone,
}: {
  active: boolean
  resourceId: string
  onDone: (updated: Record<string, unknown>) => void
}) {
  const setIsProcessing = useVisualizadorStore((s) => s.setIsProcessing)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const res = await getResourceStatusAction(resourceId)
        if (cancelled) return
        if (res.success && res.status && res.status !== 'processing' && res.resource) {
          onDone(res.resource as unknown as Record<string, unknown>)
        }
      } catch (e) {
        console.error('[POLLING] Error consultando estado:', e)
        setIsProcessing(false)
      }
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [active, resourceId, onDone, setIsProcessing])
  return null
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
  placeholder = 'Select an option',
}: {
  label: string
  value: string
  onValueChange: (v: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
}) {
  return (
    <div className='space-y-1'>
      <label className='text-xs text-muted-foreground'>{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder={placeholder} />
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
          value={toDateInputString(data.fecha_viaje)}
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

// Convierte varios formatos comunes a 'YYYY-MM-DD' compatible con inputs type="date"
function toDateInputString(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value !== 'string') return ''
  const s = value.trim()
  if (!s) return ''
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // ISO timestamp
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (iso) return iso[1]
  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return `${yyyy}-${mm}-${dd}`
  }
  // MM/DD/YYYY or MM-DD-YYYY
  m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
  if (m) {
    const [, mm2, dd2, yyyy2] = m
    return `${yyyy2}-${mm2}-${dd2}`
  }
  // Fallback: Date.parse
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) return toDateInputString(parsed)
  return ''
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
      { label: 'Combustible', value: 'combustible' },
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
