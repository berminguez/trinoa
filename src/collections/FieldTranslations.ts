import type { CollectionConfig } from 'payload'

export const FieldTranslations: CollectionConfig = {
  slug: 'field-translations',
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['order', 'key', 'label', 'valueType', 'createdAt'],
  },
  defaultSort: 'order',
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'key',
      label: 'Campo (key)',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'order',
      label: 'Orden',
      type: 'number',
      required: false,
      admin: { description: 'Orden ascendente para mostrar campos' },
    },
    {
      name: 'label',
      label: 'Etiqueta',
      type: 'text',
      required: true,
    },
    {
      name: 'labelEn',
      label: 'Etiqueta en inglés',
      type: 'text',
      required: true,
      admin: { description: 'Etiqueta en inglés' },
    },
    {
      name: 'isRequired',
      label: 'Obligatorio',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      admin: { description: 'Indica si el campo es obligatorio' },
    },
    {
      name: 'valueType',
      label: 'Tipo de dato',
      type: 'select',
      options: [
        { label: 'Texto', value: 'text' },
        { label: 'Numérico', value: 'numeric' },
        { label: 'Booleano', value: 'boolean' },
        { label: 'Fecha', value: 'date' },
      ],
      defaultValue: 'text',
      required: false,
      admin: { description: 'Tipo informativo del dato. Por defecto "text".' },
    },
  ],
}

export default FieldTranslations
