# 📚 Manual de Usuario para Administradores - Trinoa

## 🎯 Introducción

Trinoa es una plataforma avanzada de análisis de documentos especialmente diseñada para facilitar la extracción de datos estructurados de facturas y recibos, con el objetivo principal de calcular las emisiones de CO2 de las empresas. Esta herramienta está diseñada para automatizar y optimizar el proceso de gestión documental empresarial relacionado con la sostenibilidad y el reporting ambiental.

**Como administrador de Trinoa**, tienes acceso completo a todas las funcionalidades de la plataforma, incluyendo:

- 📊 **Dashboard Administrativo**: Vista global del sistema con métricas en tiempo real
- 👥 **Gestión de Clientes**: Administración completa de usuarios y sus proyectos
- 📋 **Gestión de Proyectos**: Creación, edición y supervisión de proyectos de cualquier cliente
- 📄 **Procesamiento de Documentos**: Upload, análisis y extracción de datos de facturas y recibos
- 📈 **Analíticas Avanzadas**: Reportes detallados y exportación de datos
- 🤖 **Playground de IA**: Chat inteligente con documentos procesados
- 🔧 **Configuración del Sistema**: Gestión de empresas, usuarios y configuraciones globales

---

## 🏠 1. Acceso y Dashboard Principal

### 1.1 Inicio de Sesión

1. **Acceder a la plataforma** en la URL proporcionada
2. **Introducir credenciales** de administrador (email y contraseña)
3. **Verificar el icono de administrador** que aparece en tu perfil de usuario

> 💡 **Nota**: Como administrador, verás un icono especial en el menú de usuario que indica tus permisos administrativos.

### 1.2 Dashboard Administrativo

Al acceder como administrador, llegarás al **Dashboard Administrativo** que te proporciona una vista global del sistema:

#### Métricas Principales
- **📊 Total de recursos**: Documentos procesados en todo el sistema
- **✅ Recursos confiables**: Documentos con alta confiabilidad de datos
- **🔍 Recursos verificados**: Documentos validados manualmente
- **⚠️ Necesitan revisión**: Documentos que requieren atención manual

#### Panel de Clientes
- **Vista de todas las empresas** registradas en el sistema
- **Número de proyectos activos** por cliente
- **Estado de actividad** de cada cliente
- **Acceso directo** a los proyectos de cada cliente

#### Alertas y Notificaciones
- **🚨 Procesamiento Atascado**: Documentos que han tardado más de 1 hora en procesarse
- **❌ Procesamiento Fallido**: Documentos que han fallado en el análisis
- **🔄 Reintentos necesarios**: Procesos que requieren intervención manual

---

## 👥 2. Gestión de Clientes

### 2.1 Vista General de Clientes

Desde el menú lateral, accede a **"Clientes"** para ver la gestión completa de usuarios:

#### Funcionalidades Principales
- **📋 Lista completa de clientes** con información detallada
- **🔍 Búsqueda por nombre o email**
- **📊 Filtros por fecha de registro y estado**
- **📈 Ordenamiento** por diversos criterios
- **➕ Creación de nuevos clientes**

#### Información Mostrada por Cliente
- **👤 Nombre y email** del usuario
- **📅 Fecha de registro** en la plataforma
- **📊 Número de proyectos** activos
- **🏢 Empresa asignada**
- **🏪 Filial/Departamento**
- **✅ Estado de la cuenta** (Activo/Inactivo)

### 2.2 Crear Nuevo Cliente

1. **Hacer clic en "Crear Cliente"** en la página de clientes
2. **Completar información básica**:
   - Nombre completo
   - Email (será su usuario de acceso)
   - Contraseña inicial
3. **Asignación empresarial**:
   - Seleccionar empresa existente o crear nueva
   - Definir filial/departamento (opcional)
4. **Configurar rol**:
   - Usuario estándar (recomendado para clientes)
   - Administrador (solo si es necesario)

> ⚠️ **Importante**: Los clientes solo pueden ver y gestionar sus propios proyectos y documentos.

### 2.3 Gestión de Empresas

#### Crear Nueva Empresa
1. **Acceder al formulario de empresa** desde la gestión de clientes
2. **Completar datos obligatorios**:
   - **Nombre de la empresa**: Denominación comercial
   - **CIF**: Código de Identificación Fiscal
3. **Validaciones automáticas**:
   - No duplicados por nombre
   - No duplicados por CIF
   - Formato válido de CIF

#### Asignación de Usuarios a Empresas
- **Solo administradores** pueden asignar usuarios a empresas
- **Los usuarios no pueden** cambiar su empresa asignada
- **Campo filial** de texto libre para organización interna

---

## 📋 3. Gestión de Proyectos de Clientes

### 3.1 Acceso a Proyectos de Cliente

1. **Desde la lista de clientes**, hacer clic en "Ver Proyectos"
2. **Navegación mediante breadcrumbs**: Clientes > [Nombre Cliente] > Proyectos
3. **Vista idéntica** a la gestión personal de proyectos pero para el cliente seleccionado

### 3.2 Crear Proyecto para Cliente

#### Información del Proyecto
1. **Título descriptivo**: Nombre identificativo del proyecto
2. **Descripción detallada**: Propósito y alcance del proyecto
3. **Configuración inicial**:
   - Asignación automática al cliente
   - Fecha de creación
   - Estado inicial (Activo)

#### Mejores Prácticas
- **Nomenclatura clara**: Usar nombres descriptivos como "Facturas 2024 - Trimestre 1"
- **Organización temática**: Agrupar documentos relacionados
- **Descripción detallada**: Facilitar el trabajo futuro del cliente

### 3.3 Gestión de Documentos

#### Subida de Documentos
**Tipos de archivo soportados**:
- 📄 **PDF**: Facturas, recibos, contratos
- 🖼️ **Imágenes**: JPG, PNG de facturas escaneadas

**Métodos de subida**:
1. **Arrastrar y soltar** archivos en la zona designada
2. **Seleccionar archivos** mediante el explorador
3. **Subida desde URLs** para documentos en línea

#### Procesamiento Automático
Una vez subido el documento:
1. **📤 Upload completo** del archivo al sistema
2. **🔍 Análisis OCR** para extraer texto
3. **🤖 Procesamiento IA** para identificar datos estructurados
4. **📊 Clasificación automática** por tipo de documento (electricidad, agua, gas, combustible)
5. **✅ Asignación de confianza** del análisis automático

#### Estados de Procesamiento
- **⏳ Pendiente**: Documento en cola de procesamiento
- **🔄 Procesando**: Análisis en progreso
- **✅ Completado**: Procesamiento exitoso
- **⚠️ Necesita revisión**: Requiere validación manual
- **❌ Error**: Falló el procesamiento

---

## 📄 4. Visualizador y Editor de Recursos

### 4.1 Acceso al Visualizador

1. **Desde la lista de documentos** de un proyecto
2. **Hacer clic en el nombre** del documento
3. **Vista de pantalla partida**:
   - **Izquierda**: Visor del documento (PDF/imagen)
   - **Derecha**: Formulario de edición de datos

### 4.2 Controles del Visor

#### Para documentos PDF:
- **📄 Navegación por páginas** (anterior/siguiente)
- **🔍 Zoom in/out** para mejor visualización
- **💾 Descarga** del documento original

#### Para imágenes:
- **🔍 Zoom ajustable** para detalle
- **📐 Ajuste a pantalla**
- **💾 Descarga** de la imagen

### 4.3 Edición de Datos Extraídos

#### Campos Globales (todos los documentos):
- **👤 Nombre del cliente**: Razón social o denominación
- **📄 Nombre del documento**: Título descriptivo
- **📂 Caso**: Tipo de documento (electricidad, agua, gas, combustible)
- **📝 Tipo**: Clasificación específica (factura de suministros, recibo, etc.)

#### Campos Específicos por Caso:
Cada tipo de documento tiene campos específicos:

**Electricidad**:
- Compañía suministradora
- Número de factura/recibo
- Periodo de facturación
- Consumo en kWh
- Importe total
- Fecha de emisión

**Agua**:
- Compañía suministradora
- Número de contador
- Consumo en m³
- Importe total
- Periodo de facturación

**Gas**:
- Compañía suministradora
- Tipo de gas (natural/butano/propano)
- Consumo en m³ o kg
- Importe total
- Periodo de facturación

**Combustible**:
- Gasolinera/Proveedor
- Tipo de combustible
- Litros consumidos
- Precio por litro
- Importe total

### 4.4 Validación y Guardado

1. **✏️ Editar campos** según sea necesario
2. **🔄 Cambio dinámico de caso**: Los campos se adaptan automáticamente
3. **💾 Guardar cambios**: Botón único en la cabecera
4. **✅ Confirmación**: Toast de éxito tras guardar
5. **👤 Auditoría**: Se registra quién realizó la última actualización

> 💡 **Tip**: Utiliza la navegación anterior/siguiente para revisar múltiples documentos rápidamente.

---

## 📊 5. Analíticas y Reportes

### 5.1 Acceso a Analíticas

Desde el menú lateral, accede a **"Analítica"** para ver el sistema completo de reportes.

### 5.2 Selector de Cliente (Solo Administradores)

Como administrador, puedes:
- **🎯 Ver analíticas de cualquier cliente** específico
- **📊 Vista global** de todos los clientes
- **🔄 Cambiar entre clientes** dinámicamente

### 5.3 Filtros Avanzados

#### Filtros de Fecha:
- **📅 Fecha de subida**: Desde/hasta cuando se subió el documento
- **🧾 Fecha de factura**: Periodo real de facturación del documento

#### Filtros de Contenido:
- **📂 Tipo**: Electricidad, agua, gas, combustible
- **📄 Caso**: Clasificación específica del documento
- **🏢 Proyecto**: Proyecto específico del cliente
- **🏭 Proveedor**: Compañía suministradora

### 5.4 Datos Mostrados

#### Tabla de Documentos:
- **📋 Título del documento**
- **🏢 Tipo y caso** de clasificación
- **🏭 Proveedor/Compañía**
- **📅 Fecha de subida** y fecha de factura
- **✅ Estado de confianza** del análisis
- **🎯 Acciones** disponibles (editar, ver, eliminar)

#### Totales Agregados:
- **🔢 Acumulado por Tipo**: Total por electricidad, agua, gas, combustible
- **📊 Acumulado por Caso**: Desglose detallado por subcategorías
- **🏢 Acumulado por Unidad**: Organización por filiales/departamentos

### 5.5 Exportación de Datos

#### Formatos Disponibles:
- **📊 CSV**: Para análisis en hojas de cálculo
- **📋 Excel (XLSX)**: Con formato y fórmulas pre-configuradas

#### Contenido de la Exportación:
- **Todos los documentos** filtrados actualmente
- **Datos extraídos** completos de cada documento
- **Metadatos** como fechas, estado de confianza, proveedor
- **Cálculos de emisiones** (si están configurados)

> 📝 **Uso práctico**: Estos reportes son ideales para cumplimiento regulatorio de emisiones de CO2 y reporting sostenible.

---

## 🤖 6. Playground de IA

### 6.1 Acceso al Chat Inteligente

El Playground es un sistema de chat avanzado que permite hacer consultas sobre todos los documentos procesados.

### 6.2 Funcionalidades Principales

#### Chat Contextual:
- **🧠 IA entrenada** con todos los documentos del usuario
- **🔍 Búsqueda semántica** en el contenido procesado
- **📊 Respuestas basadas en datos** extraídos

#### Tipos de Consultas Útiles:
- *"¿Cuál fue el consumo total de electricidad en enero 2024?"*
- *"¿Qué proveedores de gas hemos usado este año?"*
- *"Muéstrame el desglose de costos de agua por trimestre"*
- *"¿Cuándo vence el contrato con la compañía eléctrica?"*

### 6.3 Navegación en Conversaciones

- **📝 Conversaciones múltiples**: Cada tema en hilos separados
- **💾 Historial completo**: Acceso a conversaciones anteriores
- **🔄 Continuidad**: Reanuda conversaciones donde las dejaste

> 💡 **Tip Administrativo**: Como admin, puedes usar el playground para auditar rápidamente información de cualquier cliente.

---

## ⚙️ 7. Configuración y Administración

### 7.1 Gestión de Cuenta Propia

En **"Mi Cuenta"** puedes:
- **✏️ Editar tu nombre** personal
- **👀 Ver información de empresa** asignada (solo lectura)
- **🔧 Ver rol** y permisos administrativos
- **📅 Consultar fechas** de registro y última actualización

### 7.2 Configuración de API Keys

Para integración con sistemas externos:
1. **Acceder a configuración de APIs**
2. **Generar nuevas claves** según necesidades
3. **Gestionar permisos** de cada clave
4. **Monitorear uso** y quotas

### 7.3 Gestión de Estado del Sistema

#### Monitoreo de Salud:
- **🟢 Sistema saludable**: Todo funcionando correctamente
- **🟡 Advertencias**: Algunos procesos lentos
- **🔴 Crítico**: Requiere intervención inmediata

#### Colas de Procesamiento:
- **📊 Documentos en cola**: Número pendiente de procesar
- **⏱️ Tiempo promedio**: Estimación de procesamiento
- **🔄 Reintentos**: Documentos que requieren reprocesamiento

---

## 🚨 8. Gestión de Alertas y Problemas

### 8.1 Tipos de Alertas

#### Procesamiento Atascado:
- **📄 Documentos**: Que llevan >1 hora procesándose
- **🔧 Acción**: Revisar y reactivar manualmente
- **📍 Ubicación**: Dashboard principal

#### Documentos Erróneos:
- **❌ Fallos de análisis**: OCR o IA no pudieron procesar
- **🔍 Revisión manual**: Verificar calidad del documento
- **🔄 Reprocesamiento**: Opción de intentar nuevamente

#### Documentos con Baja Confianza:
- **⚠️ Confianza <70%**: Requieren validación manual
- **✏️ Edición requerida**: Corregir datos extraídos
- **✅ Marcado como verificado**: Tras revisión manual

### 8.2 Flujo de Resolución

1. **🔔 Identificar alerta** en dashboard o proyecto
2. **🔍 Revisar documento** afectado
3. **✏️ Corregir datos** si es necesario
4. **✅ Marcar como resuelto**
5. **📊 Actualizar estado** en el sistema

---

## 🎯 9. Mejores Prácticas para Administradores

### 9.1 Organización de Clientes

#### Nomenclatura Consistente:
- **🏢 Empresas**: Usar nombres oficiales completos
- **📂 Proyectos**: Incluir periodo y tipo (ej: "Facturas Q1 2024")
- **📄 Documentos**: Nombres descriptivos con fecha

#### Estructura Recomendada:
```
Cliente: Empresa ABC S.L.
├── Proyecto: Facturas Energía 2024
├── Proyecto: Facturas Agua 2024
└── Proyecto: Combustibles Flota 2024
```

### 9.2 Flujo de Trabajo Eficiente

#### Revisión Diaria:
1. **📊 Verificar dashboard** - estado general del sistema
2. **🚨 Revisar alertas** - resolver problemas urgentes
3. **✅ Validar documentos** - revisar elementos con baja confianza
4. **📈 Monitorear progreso** - verificar que los procesamientos avanzan

#### Revisión Semanal:
1. **👥 Gestión de clientes** - nuevos registros, cambios de empresa
2. **📊 Analíticas agregadas** - tendencias y patrones
3. **🔧 Mantenimiento** - limpiar conversaciones antiguas, organizar datos

### 9.3 Resolución de Problemas Comunes

#### Documento no Procesado:
1. **Verificar formato** del archivo (PDF/imagen válida)
2. **Revisar calidad** de la imagen o escaneo
3. **Reprocessar manualmente** si es necesario
4. **Contactar soporte** si persiste el problema

#### Datos Extraídos Incorrectos:
1. **Editar manualmente** en el visualizador
2. **Marcar como verificado** tras corrección
3. **Reportar patrones** de error recurrentes

#### Cliente no puede Acceder:
1. **Verificar credenciales** y estado de cuenta
2. **Revisar asignación** de empresa
3. **Regenerar contraseña** si es necesario

---

## 🔒 10. Seguridad y Privacidad

### 10.1 Principios de Seguridad

- **🔐 Acceso basado en roles**: Cada usuario ve solo sus datos
- **🛡️ Separación de contextos**: Admin vs usuario claramente diferenciados
- **📝 Auditoría completa**: Registro de todas las acciones administrativas
- **🔒 Encriptación**: Datos sensibles protegidos en tránsito y reposo

### 10.2 Responsabilidades del Administrador

- **👀 Supervisión responsable**: Acceder a datos de clientes solo cuando sea necesario
- **🔧 Uso apropiado**: Utilizar permisos administrativos para soporte, no inspección
- **📋 Documentación**: Registrar intervenciones importantes para auditoría
- **🔄 Actualizaciones**: Mantener información de clientes actualizada y precisa

---

## 📞 11. Soporte y Contacto

### 11.1 Recursos de Ayuda

- **📚 Documentación técnica**: Disponible en la plataforma
- **🎥 Tutoriales en video**: Para funcionalidades complejas
- **❓ FAQ**: Preguntas frecuentes actualizadas

### 11.2 Contacto con Soporte

Para problemas técnicos o consultas:
- **📧 Email de soporte**: [contacto técnico]
- **📱 Chat en línea**: Disponible en horario laboral
- **🚨 Emergencias**: Línea directa para problemas críticos

---

## 📈 12. Casos de Uso Prácticos

### 12.1 Onboarding de Nuevo Cliente

1. **👤 Crear usuario** en el sistema
2. **🏢 Asignar a empresa** (crear si no existe)
3. **📋 Crear proyecto inicial** para el cliente
4. **📚 Proporcionar credenciales** y tutorial básico
5. **🎯 Seguimiento inicial** para resolver dudas

### 12.2 Auditoría de Emisiones CO2

1. **📊 Acceder a analíticas** del cliente
2. **🔍 Filtrar por periodo** de auditoría
3. **📋 Exportar datos** completos a Excel
4. **🧮 Calcular emisiones** usando factores de conversión
5. **📄 Generar reporte** para cumplimiento regulatorio

### 12.3 Resolución de Incidencias

1. **🚨 Identificar problema** (alerta o reporte de cliente)
2. **🔍 Acceder al contexto** del cliente afectado
3. **🛠️ Aplicar solución** (corrección de datos, reprocesamiento)
4. **✅ Verificar resolución** con el cliente
5. **📝 Documentar solución** para casos futuros

---

## 🎓 Conclusión

Como administrador de Trinoa, tienes a tu disposición una plataforma potente y completa para la gestión de documentos relacionados con sostenibilidad empresarial. Tu rol es crucial para:

- **🎯 Facilitar el trabajo** de los clientes con gestión proactiva
- **📊 Garantizar la calidad** de los datos procesados
- **🔧 Resolver incidencias** de manera eficiente
- **📈 Optimizar el flujo de trabajo** general del sistema

La plataforma está diseñada para ser intuitiva, pero la experiencia y las mejores prácticas administrativas marcarán la diferencia en la satisfacción del cliente y la eficiencia operativa.

> 💡 **Recuerda**: Tu trabajo como administrador no solo es técnico, sino que contribuye directamente a los objetivos de sostenibilidad y reporting ambiental de las empresas que utilizan Trinoa.

---

**📅 Última actualización**: Septiembre 2025  
**🔖 Versión del manual**: 1.0  
**👥 Dirigido a**: Administradores de la plataforma Trinoa
