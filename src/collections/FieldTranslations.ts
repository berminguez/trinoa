import type { CollectionConfig } from 'payload'

export const FieldTranslations: CollectionConfig = {
  slug: 'field-translations',
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['order', 'key', 'label', 'createdAt'],
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
  ],
}

export default FieldTranslations
