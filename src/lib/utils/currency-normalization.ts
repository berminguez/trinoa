/**
 * Utilidades para normalización de monedas según ISO 4217
 * Basado en: https://es.wikipedia.org/wiki/ISO_4217
 */

export interface CurrencyInfo {
  code: string
  name: string
  nameEn: string
  symbol?: string
  variants: string[]
}

/**
 * Lista completa de monedas ISO 4217 con variantes de normalización
 * Las 3 primeras (EUR, USD, GBP) están priorizadas para fácil acceso
 */
export const CURRENCIES: CurrencyInfo[] = [
  // Monedas principales (priorizadas)
  {
    code: 'EUR',
    name: 'Euro',
    nameEn: 'Euro',
    symbol: '€',
    variants: ['eur', 'euro', 'euros', '€', 'eur.', 'european', 'europa'],
  },
  {
    code: 'USD',
    name: 'Dólar estadounidense',
    nameEn: 'US Dollar',
    symbol: '$',
    variants: [
      'usd',
      'dollar',
      'dollars',
      '$',
      'usd.',
      'us dollar',
      'american dollar',
      'dolar',
      'dolares',
    ],
  },
  {
    code: 'GBP',
    name: 'Libra esterlina',
    nameEn: 'British Pound',
    symbol: '£',
    variants: [
      'gbp',
      'pound',
      'pounds',
      '£',
      'gbp.',
      'sterling',
      'british pound',
      'libra',
      'libras',
    ],
  },

  // Resto de monedas alfabéticamente
  {
    code: 'AED',
    name: 'Dirham de los Emiratos Árabes Unidos',
    nameEn: 'UAE Dirham',
    variants: ['aed', 'dirham', 'dirhams', 'uae dirham', 'emirates dirham'],
  },
  {
    code: 'AFN',
    name: 'Afgani afgano',
    nameEn: 'Afghan Afghani',
    variants: ['afn', 'afghani', 'afghanis', 'afghan afghani'],
  },
  {
    code: 'ALL',
    name: 'Lek albanés',
    nameEn: 'Albanian Lek',
    variants: ['all', 'lek', 'leks', 'albanian lek'],
  },
  {
    code: 'AMD',
    name: 'Dram armenio',
    nameEn: 'Armenian Dram',
    variants: ['amd', 'dram', 'drams', 'armenian dram'],
  },
  {
    code: 'ANG',
    name: 'Florín de las Antillas Neerlandesas',
    nameEn: 'Netherlands Antillean Guilder',
    variants: ['ang', 'guilder', 'guilders', 'florin', 'florins', 'antillean guilder'],
  },
  {
    code: 'AOA',
    name: 'Kwanza angoleño',
    nameEn: 'Angolan Kwanza',
    variants: ['aoa', 'kwanza', 'kwanzas', 'angolan kwanza'],
  },
  {
    code: 'ARS',
    name: 'Peso argentino',
    nameEn: 'Argentine Peso',
    variants: ['ars', 'peso argentino', 'pesos argentinos', 'argentine peso', 'peso', 'pesos'],
  },
  {
    code: 'AUD',
    name: 'Dólar australiano',
    nameEn: 'Australian Dollar',
    variants: [
      'aud',
      'australian dollar',
      'aussie dollar',
      'dolar australiano',
      'dolares australianos',
    ],
  },
  {
    code: 'AWG',
    name: 'Florín arubeño',
    nameEn: 'Aruban Florin',
    variants: ['awg', 'aruban florin', 'florin', 'florins', 'aruban guilder'],
  },
  {
    code: 'AZN',
    name: 'Manat azerbaiyano',
    nameEn: 'Azerbaijani Manat',
    variants: ['azn', 'manat', 'manats', 'azerbaijani manat'],
  },
  {
    code: 'BAM',
    name: 'Marco convertible de Bosnia y Herzegovina',
    nameEn: 'Bosnia and Herzegovina Convertible Mark',
    variants: ['bam', 'convertible mark', 'bosnia mark', 'marco convertible'],
  },
  {
    code: 'BBD',
    name: 'Dólar de Barbados',
    nameEn: 'Barbadian Dollar',
    variants: ['bbd', 'barbadian dollar', 'barbados dollar', 'dolar barbados'],
  },
  {
    code: 'BDT',
    name: 'Taka bangladesí',
    nameEn: 'Bangladeshi Taka',
    variants: ['bdt', 'taka', 'takas', 'bangladeshi taka'],
  },
  {
    code: 'BGN',
    name: 'Lev búlgaro',
    nameEn: 'Bulgarian Lev',
    variants: ['bgn', 'lev', 'levs', 'bulgarian lev', 'leva'],
  },
  {
    code: 'BHD',
    name: 'Dinar bahreiní',
    nameEn: 'Bahraini Dinar',
    variants: ['bhd', 'bahraini dinar', 'bahrain dinar', 'dinar bahrein'],
  },
  {
    code: 'BIF',
    name: 'Franco burundés',
    nameEn: 'Burundian Franc',
    variants: ['bif', 'burundian franc', 'burundi franc', 'franco burundi'],
  },
  {
    code: 'BMD',
    name: 'Dólar de las Bermudas',
    nameEn: 'Bermudian Dollar',
    variants: ['bmd', 'bermudian dollar', 'bermuda dollar', 'dolar bermudas'],
  },
  {
    code: 'BND',
    name: 'Dólar de Brunéi',
    nameEn: 'Brunei Dollar',
    variants: ['bnd', 'brunei dollar', 'dolar brunei'],
  },
  {
    code: 'BOB',
    name: 'Boliviano',
    nameEn: 'Bolivian Boliviano',
    variants: ['bob', 'boliviano', 'bolivianos', 'bolivian boliviano'],
  },
  {
    code: 'BRL',
    name: 'Real brasileño',
    nameEn: 'Brazilian Real',
    variants: ['brl', 'real', 'reales', 'brazilian real', 'reais'],
  },
  {
    code: 'BSD',
    name: 'Dólar bahameño',
    nameEn: 'Bahamian Dollar',
    variants: ['bsd', 'bahamian dollar', 'bahamas dollar', 'dolar bahamas'],
  },
  {
    code: 'BTN',
    name: 'Ngultrum butanés',
    nameEn: 'Bhutanese Ngultrum',
    variants: ['btn', 'ngultrum', 'ngultrums', 'bhutanese ngultrum'],
  },
  {
    code: 'BWP',
    name: 'Pula de Botsuana',
    nameEn: 'Botswanan Pula',
    variants: ['bwp', 'pula', 'pulas', 'botswana pula'],
  },
  {
    code: 'BYN',
    name: 'Rublo bielorruso',
    nameEn: 'Belarusian Ruble',
    variants: ['byn', 'belarusian ruble', 'belarus ruble', 'rublo bielorruso'],
  },
  {
    code: 'BZD',
    name: 'Dólar beliceño',
    nameEn: 'Belize Dollar',
    variants: ['bzd', 'belize dollar', 'dolar belice'],
  },
  {
    code: 'CAD',
    name: 'Dólar canadiense',
    nameEn: 'Canadian Dollar',
    variants: ['cad', 'canadian dollar', 'canada dollar', 'dolar canadiense', 'loonie'],
  },
  {
    code: 'CDF',
    name: 'Franco congoleño',
    nameEn: 'Congolese Franc',
    variants: ['cdf', 'congolese franc', 'congo franc', 'franco congo'],
  },
  {
    code: 'CHF',
    name: 'Franco suizo',
    nameEn: 'Swiss Franc',
    variants: ['chf', 'swiss franc', 'switzerland franc', 'franco suizo', 'swissy'],
  },
  {
    code: 'CLP',
    name: 'Peso chileno',
    nameEn: 'Chilean Peso',
    variants: ['clp', 'peso chileno', 'pesos chilenos', 'chilean peso'],
  },
  {
    code: 'CNY',
    name: 'Yuan chino',
    nameEn: 'Chinese Yuan',
    variants: ['cny', 'yuan', 'yuanes', 'chinese yuan', 'renminbi', 'rmb', '¥'],
  },
  {
    code: 'COP',
    name: 'Peso colombiano',
    nameEn: 'Colombian Peso',
    variants: ['cop', 'peso colombiano', 'pesos colombianos', 'colombian peso'],
  },
  {
    code: 'CRC',
    name: 'Colón costarricense',
    nameEn: 'Costa Rican Colón',
    variants: ['crc', 'colon', 'colones', 'costa rican colon', 'colon costarricense'],
  },
  {
    code: 'CUP',
    name: 'Peso cubano',
    nameEn: 'Cuban Peso',
    variants: ['cup', 'peso cubano', 'pesos cubanos', 'cuban peso'],
  },
  {
    code: 'CVE',
    name: 'Escudo caboverdiano',
    nameEn: 'Cape Verdean Escudo',
    variants: ['cve', 'escudo', 'escudos', 'cape verde escudo', 'escudo caboverdiano'],
  },
  {
    code: 'CZK',
    name: 'Corona checa',
    nameEn: 'Czech Koruna',
    variants: ['czk', 'koruna', 'korunas', 'czech koruna', 'corona checa', 'coronas checas'],
  },
  {
    code: 'DJF',
    name: 'Franco yibutiano',
    nameEn: 'Djiboutian Franc',
    variants: ['djf', 'djiboutian franc', 'djibouti franc', 'franco yibuti'],
  },
  {
    code: 'DKK',
    name: 'Corona danesa',
    nameEn: 'Danish Krone',
    variants: ['dkk', 'krone', 'kroner', 'danish krone', 'corona danesa', 'coronas danesas'],
  },
  {
    code: 'DOP',
    name: 'Peso dominicano',
    nameEn: 'Dominican Peso',
    variants: ['dop', 'peso dominicano', 'pesos dominicanos', 'dominican peso'],
  },
  {
    code: 'DZD',
    name: 'Dinar argelino',
    nameEn: 'Algerian Dinar',
    variants: ['dzd', 'algerian dinar', 'algeria dinar', 'dinar argelino'],
  },
  {
    code: 'EGP',
    name: 'Libra egipcia',
    nameEn: 'Egyptian Pound',
    variants: ['egp', 'egyptian pound', 'egypt pound', 'libra egipcia'],
  },
  {
    code: 'ERN',
    name: 'Nakfa eritreo',
    nameEn: 'Eritrean Nakfa',
    variants: ['ern', 'nakfa', 'nakfas', 'eritrean nakfa'],
  },
  {
    code: 'ETB',
    name: 'Birr etíope',
    nameEn: 'Ethiopian Birr',
    variants: ['etb', 'birr', 'birrs', 'ethiopian birr'],
  },
  {
    code: 'FJD',
    name: 'Dólar fiyiano',
    nameEn: 'Fijian Dollar',
    variants: ['fjd', 'fijian dollar', 'fiji dollar', 'dolar fiji'],
  },
  {
    code: 'FKP',
    name: 'Libra de las Islas Malvinas',
    nameEn: 'Falkland Islands Pound',
    variants: ['fkp', 'falkland pound', 'malvinas pound', 'libra malvinas'],
  },
  {
    code: 'GEL',
    name: 'Lari georgiano',
    nameEn: 'Georgian Lari',
    variants: ['gel', 'lari', 'laris', 'georgian lari'],
  },
  {
    code: 'GGP',
    name: 'Libra de Guernsey',
    nameEn: 'Guernsey Pound',
    variants: ['ggp', 'guernsey pound', 'libra guernsey'],
  },
  {
    code: 'GHS',
    name: 'Cedi ghanés',
    nameEn: 'Ghanaian Cedi',
    variants: ['ghs', 'cedi', 'cedis', 'ghanaian cedi', 'ghana cedi'],
  },
  {
    code: 'GIP',
    name: 'Libra de Gibraltar',
    nameEn: 'Gibraltar Pound',
    variants: ['gip', 'gibraltar pound', 'libra gibraltar'],
  },
  {
    code: 'GMD',
    name: 'Dalasi gambiano',
    nameEn: 'Gambian Dalasi',
    variants: ['gmd', 'dalasi', 'dalasis', 'gambian dalasi'],
  },
  {
    code: 'GNF',
    name: 'Franco guineano',
    nameEn: 'Guinean Franc',
    variants: ['gnf', 'guinean franc', 'guinea franc', 'franco guinea'],
  },
  {
    code: 'GTQ',
    name: 'Quetzal guatemalteco',
    nameEn: 'Guatemalan Quetzal',
    variants: ['gtq', 'quetzal', 'quetzales', 'guatemalan quetzal'],
  },
  {
    code: 'GYD',
    name: 'Dólar guyanés',
    nameEn: 'Guyanese Dollar',
    variants: ['gyd', 'guyanese dollar', 'guyana dollar', 'dolar guyana'],
  },
  {
    code: 'HKD',
    name: 'Dólar de Hong Kong',
    nameEn: 'Hong Kong Dollar',
    variants: ['hkd', 'hong kong dollar', 'hk dollar', 'dolar hong kong'],
  },
  {
    code: 'HNL',
    name: 'Lempira hondureño',
    nameEn: 'Honduran Lempira',
    variants: ['hnl', 'lempira', 'lempiras', 'honduran lempira'],
  },
  {
    code: 'HRK',
    name: 'Kuna croata',
    nameEn: 'Croatian Kuna',
    variants: ['hrk', 'kuna', 'kunas', 'croatian kuna'],
  },
  {
    code: 'HTG',
    name: 'Gourde haitiano',
    nameEn: 'Haitian Gourde',
    variants: ['htg', 'gourde', 'gourdes', 'haitian gourde'],
  },
  {
    code: 'HUF',
    name: 'Forinto húngaro',
    nameEn: 'Hungarian Forint',
    variants: ['huf', 'forint', 'forints', 'hungarian forint'],
  },
  {
    code: 'IDR',
    name: 'Rupia indonesia',
    nameEn: 'Indonesian Rupiah',
    variants: ['idr', 'rupiah', 'rupiahs', 'indonesian rupiah', 'rupia indonesia'],
  },
  {
    code: 'ILS',
    name: 'Nuevo séquel israelí',
    nameEn: 'Israeli New Shekel',
    variants: ['ils', 'shekel', 'shekels', 'israeli shekel', 'new shekel', '₪'],
  },
  {
    code: 'IMP',
    name: 'Libra de la Isla de Man',
    nameEn: 'Isle of Man Pound',
    variants: ['imp', 'isle of man pound', 'manx pound', 'libra isla man'],
  },
  {
    code: 'INR',
    name: 'Rupia india',
    nameEn: 'Indian Rupee',
    variants: ['inr', 'rupee', 'rupees', 'indian rupee', 'rupia india', '₹'],
  },
  {
    code: 'IQD',
    name: 'Dinar iraquí',
    nameEn: 'Iraqi Dinar',
    variants: ['iqd', 'iraqi dinar', 'iraq dinar', 'dinar iraqi'],
  },
  {
    code: 'IRR',
    name: 'Rial iraní',
    nameEn: 'Iranian Rial',
    variants: ['irr', 'rial', 'rials', 'iranian rial', 'rial irani'],
  },
  {
    code: 'ISK',
    name: 'Corona islandesa',
    nameEn: 'Icelandic Króna',
    variants: ['isk', 'krona', 'kronas', 'icelandic krona', 'corona islandesa'],
  },
  {
    code: 'JEP',
    name: 'Libra de Jersey',
    nameEn: 'Jersey Pound',
    variants: ['jep', 'jersey pound', 'libra jersey'],
  },
  {
    code: 'JMD',
    name: 'Dólar jamaicano',
    nameEn: 'Jamaican Dollar',
    variants: ['jmd', 'jamaican dollar', 'jamaica dollar', 'dolar jamaica'],
  },
  {
    code: 'JOD',
    name: 'Dinar jordano',
    nameEn: 'Jordanian Dinar',
    variants: ['jod', 'jordanian dinar', 'jordan dinar', 'dinar jordano'],
  },
  {
    code: 'JPY',
    name: 'Yen japonés',
    nameEn: 'Japanese Yen',
    variants: ['jpy', 'yen', 'yenes', 'japanese yen', '¥'],
  },
  {
    code: 'KES',
    name: 'Chelín keniano',
    nameEn: 'Kenyan Shilling',
    variants: ['kes', 'shilling', 'shillings', 'kenyan shilling', 'chelin keniano'],
  },
  {
    code: 'KGS',
    name: 'Som kirguís',
    nameEn: 'Kyrgyzstani Som',
    variants: ['kgs', 'som', 'soms', 'kyrgyz som', 'som kirguis'],
  },
  {
    code: 'KHR',
    name: 'Riel camboyano',
    nameEn: 'Cambodian Riel',
    variants: ['khr', 'riel', 'riels', 'cambodian riel'],
  },
  {
    code: 'KMF',
    name: 'Franco comorense',
    nameEn: 'Comorian Franc',
    variants: ['kmf', 'comorian franc', 'comoros franc', 'franco comoras'],
  },
  {
    code: 'KPW',
    name: 'Won norcoreano',
    nameEn: 'North Korean Won',
    variants: ['kpw', 'north korean won', 'won norcoreano'],
  },
  {
    code: 'KRW',
    name: 'Won surcoreano',
    nameEn: 'South Korean Won',
    variants: ['krw', 'won', 'wons', 'south korean won', 'korean won', '₩'],
  },
  {
    code: 'KWD',
    name: 'Dinar kuwaití',
    nameEn: 'Kuwaiti Dinar',
    variants: ['kwd', 'kuwaiti dinar', 'kuwait dinar', 'dinar kuwaiti'],
  },
  {
    code: 'KYD',
    name: 'Dólar de las Islas Caimán',
    nameEn: 'Cayman Islands Dollar',
    variants: ['kyd', 'cayman dollar', 'dolar caiman'],
  },
  {
    code: 'KZT',
    name: 'Tenge kazajo',
    nameEn: 'Kazakhstani Tenge',
    variants: ['kzt', 'tenge', 'tenges', 'kazakhstani tenge', 'tenge kazajo'],
  },
  {
    code: 'LAK',
    name: 'Kip laosiano',
    nameEn: 'Lao Kip',
    variants: ['lak', 'kip', 'kips', 'lao kip', 'laotian kip'],
  },
  {
    code: 'LBP',
    name: 'Libra libanesa',
    nameEn: 'Lebanese Pound',
    variants: ['lbp', 'lebanese pound', 'lebanon pound', 'libra libanesa'],
  },
  {
    code: 'LKR',
    name: 'Rupia de Sri Lanka',
    nameEn: 'Sri Lankan Rupee',
    variants: ['lkr', 'sri lankan rupee', 'sri lanka rupee', 'rupia sri lanka'],
  },
  {
    code: 'LRD',
    name: 'Dólar liberiano',
    nameEn: 'Liberian Dollar',
    variants: ['lrd', 'liberian dollar', 'liberia dollar', 'dolar liberia'],
  },
  {
    code: 'LSL',
    name: 'Loti lesothense',
    nameEn: 'Lesotho Loti',
    variants: ['lsl', 'loti', 'lotis', 'lesotho loti'],
  },
  {
    code: 'LYD',
    name: 'Dinar libio',
    nameEn: 'Libyan Dinar',
    variants: ['lyd', 'libyan dinar', 'libya dinar', 'dinar libio'],
  },
  {
    code: 'MAD',
    name: 'Dirham marroquí',
    nameEn: 'Moroccan Dirham',
    variants: ['mad', 'moroccan dirham', 'morocco dirham', 'dirham marroqui'],
  },
  {
    code: 'MDL',
    name: 'Leu moldavo',
    nameEn: 'Moldovan Leu',
    variants: ['mdl', 'leu', 'leus', 'moldovan leu', 'moldova leu'],
  },
  {
    code: 'MGA',
    name: 'Ariary malgache',
    nameEn: 'Malagasy Ariary',
    variants: ['mga', 'ariary', 'ariarys', 'malagasy ariary', 'madagascar ariary'],
  },
  {
    code: 'MKD',
    name: 'Denar macedonio',
    nameEn: 'Macedonian Denar',
    variants: ['mkd', 'denar', 'denars', 'macedonian denar'],
  },
  {
    code: 'MMK',
    name: 'Kyat birmano',
    nameEn: 'Myanmar Kyat',
    variants: ['mmk', 'kyat', 'kyats', 'myanmar kyat', 'burma kyat'],
  },
  {
    code: 'MNT',
    name: 'Tugrik mongol',
    nameEn: 'Mongolian Tugrik',
    variants: ['mnt', 'tugrik', 'tugriks', 'mongolian tugrik'],
  },
  {
    code: 'MOP',
    name: 'Pataca de Macao',
    nameEn: 'Macanese Pataca',
    variants: ['mop', 'pataca', 'patacas', 'macanese pataca', 'macao pataca'],
  },
  {
    code: 'MRU',
    name: 'Ouguiya mauritano',
    nameEn: 'Mauritanian Ouguiya',
    variants: ['mru', 'ouguiya', 'ouguiyas', 'mauritanian ouguiya'],
  },
  {
    code: 'MUR',
    name: 'Rupia mauriciana',
    nameEn: 'Mauritian Rupee',
    variants: ['mur', 'mauritian rupee', 'mauritius rupee', 'rupia mauricio'],
  },
  {
    code: 'MVR',
    name: 'Rufiyaa de Maldivas',
    nameEn: 'Maldivian Rufiyaa',
    variants: ['mvr', 'rufiyaa', 'rufiyaas', 'maldivian rufiyaa'],
  },
  {
    code: 'MWK',
    name: 'Kwacha malauí',
    nameEn: 'Malawian Kwacha',
    variants: ['mwk', 'kwacha', 'kwachas', 'malawian kwacha', 'malawi kwacha'],
  },
  {
    code: 'MXN',
    name: 'Peso mexicano',
    nameEn: 'Mexican Peso',
    variants: ['mxn', 'peso mexicano', 'pesos mexicanos', 'mexican peso'],
  },
  {
    code: 'MYR',
    name: 'Ringgit malayo',
    nameEn: 'Malaysian Ringgit',
    variants: ['myr', 'ringgit', 'ringgits', 'malaysian ringgit'],
  },
  {
    code: 'MZN',
    name: 'Metical mozambiqueño',
    nameEn: 'Mozambican Metical',
    variants: ['mzn', 'metical', 'meticais', 'mozambican metical'],
  },
  {
    code: 'NAD',
    name: 'Dólar namibio',
    nameEn: 'Namibian Dollar',
    variants: ['nad', 'namibian dollar', 'namibia dollar', 'dolar namibia'],
  },
  {
    code: 'NGN',
    name: 'Naira nigeriano',
    nameEn: 'Nigerian Naira',
    variants: ['ngn', 'naira', 'nairas', 'nigerian naira', '₦'],
  },
  {
    code: 'NIO',
    name: 'Córdoba nicaragüense',
    nameEn: 'Nicaraguan Córdoba',
    variants: ['nio', 'cordoba', 'cordobas', 'nicaraguan cordoba', 'córdoba'],
  },
  {
    code: 'NOK',
    name: 'Corona noruega',
    nameEn: 'Norwegian Krone',
    variants: ['nok', 'norwegian krone', 'norway krone', 'corona noruega'],
  },
  {
    code: 'NPR',
    name: 'Rupia nepalí',
    nameEn: 'Nepalese Rupee',
    variants: ['npr', 'nepalese rupee', 'nepal rupee', 'rupia nepal'],
  },
  {
    code: 'NZD',
    name: 'Dólar neozelandés',
    nameEn: 'New Zealand Dollar',
    variants: ['nzd', 'new zealand dollar', 'nz dollar', 'dolar nueva zelanda', 'kiwi'],
  },
  {
    code: 'OMR',
    name: 'Rial omaní',
    nameEn: 'Omani Rial',
    variants: ['omr', 'omani rial', 'oman rial', 'rial omani'],
  },
  {
    code: 'PAB',
    name: 'Balboa panameño',
    nameEn: 'Panamanian Balboa',
    variants: ['pab', 'balboa', 'balboas', 'panamanian balboa'],
  },
  {
    code: 'PEN',
    name: 'Sol peruano',
    nameEn: 'Peruvian Sol',
    variants: ['pen', 'sol', 'soles', 'peruvian sol', 'nuevo sol'],
  },
  {
    code: 'PGK',
    name: 'Kina de Papúa Nueva Guinea',
    nameEn: 'Papua New Guinean Kina',
    variants: ['pgk', 'kina', 'kinas', 'papua new guinea kina'],
  },
  {
    code: 'PHP',
    name: 'Peso filipino',
    nameEn: 'Philippine Peso',
    variants: ['php', 'peso filipino', 'pesos filipinos', 'philippine peso', '₱'],
  },
  {
    code: 'PKR',
    name: 'Rupia pakistaní',
    nameEn: 'Pakistani Rupee',
    variants: ['pkr', 'pakistani rupee', 'pakistan rupee', 'rupia pakistan'],
  },
  {
    code: 'PLN',
    name: 'Zloty polaco',
    nameEn: 'Polish Złoty',
    variants: ['pln', 'zloty', 'zlotys', 'polish zloty', 'złoty'],
  },
  {
    code: 'PYG',
    name: 'Guaraní paraguayo',
    nameEn: 'Paraguayan Guaraní',
    variants: ['pyg', 'guarani', 'guaranis', 'paraguayan guarani', 'guaraní'],
  },
  {
    code: 'QAR',
    name: 'Riyal catarí',
    nameEn: 'Qatari Riyal',
    variants: ['qar', 'riyal', 'riyals', 'qatari riyal', 'qatar riyal'],
  },
  {
    code: 'RON',
    name: 'Leu rumano',
    nameEn: 'Romanian Leu',
    variants: ['ron', 'romanian leu', 'romania leu', 'leu rumano'],
  },
  {
    code: 'RSD',
    name: 'Dinar serbio',
    nameEn: 'Serbian Dinar',
    variants: ['rsd', 'serbian dinar', 'serbia dinar', 'dinar serbio'],
  },
  {
    code: 'RUB',
    name: 'Rublo ruso',
    nameEn: 'Russian Ruble',
    variants: ['rub', 'ruble', 'rubles', 'russian ruble', 'rublo ruso', '₽'],
  },
  {
    code: 'RWF',
    name: 'Franco ruandés',
    nameEn: 'Rwandan Franc',
    variants: ['rwf', 'rwandan franc', 'rwanda franc', 'franco ruanda'],
  },
  {
    code: 'SAR',
    name: 'Riyal saudí',
    nameEn: 'Saudi Riyal',
    variants: ['sar', 'saudi riyal', 'saudi arabia riyal', 'riyal saudi'],
  },
  {
    code: 'SBD',
    name: 'Dólar de las Islas Salomón',
    nameEn: 'Solomon Islands Dollar',
    variants: ['sbd', 'solomon islands dollar', 'solomon dollar', 'dolar salomon'],
  },
  {
    code: 'SCR',
    name: 'Rupia de Seychelles',
    nameEn: 'Seychellois Rupee',
    variants: ['scr', 'seychelles rupee', 'seychellois rupee', 'rupia seychelles'],
  },
  {
    code: 'SDG',
    name: 'Libra sudanesa',
    nameEn: 'Sudanese Pound',
    variants: ['sdg', 'sudanese pound', 'sudan pound', 'libra sudanesa'],
  },
  {
    code: 'SEK',
    name: 'Corona sueca',
    nameEn: 'Swedish Krona',
    variants: ['sek', 'swedish krona', 'sweden krona', 'corona sueca'],
  },
  {
    code: 'SGD',
    name: 'Dólar de Singapur',
    nameEn: 'Singapore Dollar',
    variants: ['sgd', 'singapore dollar', 'dolar singapur'],
  },
  {
    code: 'SHP',
    name: 'Libra de Santa Elena',
    nameEn: 'Saint Helena Pound',
    variants: ['shp', 'saint helena pound', 'libra santa elena'],
  },
  {
    code: 'SLE',
    name: 'Leone de Sierra Leona',
    nameEn: 'Sierra Leonean Leone',
    variants: ['sle', 'leone', 'leones', 'sierra leone leone'],
  },
  {
    code: 'SOS',
    name: 'Chelín somalí',
    nameEn: 'Somali Shilling',
    variants: ['sos', 'somali shilling', 'somalia shilling', 'chelin somali'],
  },
  {
    code: 'SRD',
    name: 'Dólar surinamés',
    nameEn: 'Surinamese Dollar',
    variants: ['srd', 'surinamese dollar', 'suriname dollar', 'dolar surinam'],
  },
  {
    code: 'STN',
    name: 'Dobra de Santo Tomé y Príncipe',
    nameEn: 'São Tomé and Príncipe Dobra',
    variants: ['stn', 'dobra', 'dobras', 'sao tome dobra'],
  },
  {
    code: 'SYP',
    name: 'Libra siria',
    nameEn: 'Syrian Pound',
    variants: ['syp', 'syrian pound', 'syria pound', 'libra siria'],
  },
  {
    code: 'SZL',
    name: 'Lilangeni suazi',
    nameEn: 'Swazi Lilangeni',
    variants: ['szl', 'lilangeni', 'lilangenis', 'swazi lilangeni'],
  },
  {
    code: 'THB',
    name: 'Baht tailandés',
    nameEn: 'Thai Baht',
    variants: ['thb', 'baht', 'bahts', 'thai baht', '฿'],
  },
  {
    code: 'TJS',
    name: 'Somoni tayiko',
    nameEn: 'Tajikistani Somoni',
    variants: ['tjs', 'somoni', 'somonis', 'tajikistani somoni'],
  },
  {
    code: 'TMT',
    name: 'Manat turcomano',
    nameEn: 'Turkmenistani Manat',
    variants: ['tmt', 'turkmen manat', 'turkmenistan manat', 'manat turcomano'],
  },
  {
    code: 'TND',
    name: 'Dinar tunecino',
    nameEn: 'Tunisian Dinar',
    variants: ['tnd', 'tunisian dinar', 'tunisia dinar', 'dinar tunecino'],
  },
  {
    code: 'TOP',
    name: 'Paʻanga tongano',
    nameEn: 'Tongan Paʻanga',
    variants: ['top', 'paanga', 'paangas', 'tongan paanga'],
  },
  {
    code: 'TRY',
    name: 'Lira turca',
    nameEn: 'Turkish Lira',
    variants: ['try', 'lira', 'liras', 'turkish lira', 'lira turca', '₺'],
  },
  {
    code: 'TTD',
    name: 'Dólar de Trinidad y Tobago',
    nameEn: 'Trinidad and Tobago Dollar',
    variants: ['ttd', 'trinidad dollar', 'tobago dollar', 'dolar trinidad'],
  },
  {
    code: 'TVD',
    name: 'Dólar tuvaluano',
    nameEn: 'Tuvaluan Dollar',
    variants: ['tvd', 'tuvaluan dollar', 'tuvalu dollar', 'dolar tuvalu'],
  },
  {
    code: 'TWD',
    name: 'Nuevo dólar taiwanés',
    nameEn: 'New Taiwan Dollar',
    variants: ['twd', 'taiwan dollar', 'taiwanese dollar', 'dolar taiwan', 'nt$'],
  },
  {
    code: 'TZS',
    name: 'Chelín tanzano',
    nameEn: 'Tanzanian Shilling',
    variants: ['tzs', 'tanzanian shilling', 'tanzania shilling', 'chelin tanzano'],
  },
  {
    code: 'UAH',
    name: 'Grivna ucraniana',
    nameEn: 'Ukrainian Hryvnia',
    variants: ['uah', 'hryvnia', 'hryvnias', 'ukrainian hryvnia', 'grivna', '₴'],
  },
  {
    code: 'UGX',
    name: 'Chelín ugandés',
    nameEn: 'Ugandan Shilling',
    variants: ['ugx', 'ugandan shilling', 'uganda shilling', 'chelin uganda'],
  },
  {
    code: 'UYU',
    name: 'Peso uruguayo',
    nameEn: 'Uruguayan Peso',
    variants: ['uyu', 'peso uruguayo', 'pesos uruguayos', 'uruguayan peso'],
  },
  {
    code: 'UZS',
    name: 'Som uzbeko',
    nameEn: 'Uzbekistani Som',
    variants: ['uzs', 'uzbek som', 'uzbekistan som', 'som uzbeko'],
  },
  {
    code: 'VED',
    name: 'Bolívar digital venezolano',
    nameEn: 'Venezuelan Bolívar Digital',
    variants: ['ved', 'bolivar digital', 'bolivar venezolano', 'venezuelan bolivar'],
  },
  {
    code: 'VES',
    name: 'Bolívar soberano venezolano',
    nameEn: 'Venezuelan Bolívar Soberano',
    variants: ['ves', 'bolivar soberano', 'bolivar', 'venezuelan bolivar'],
  },
  {
    code: 'VND',
    name: 'Dong vietnamita',
    nameEn: 'Vietnamese Dong',
    variants: ['vnd', 'dong', 'dongs', 'vietnamese dong', '₫'],
  },
  {
    code: 'VUV',
    name: 'Vatu vanuatuense',
    nameEn: 'Vanuatu Vatu',
    variants: ['vuv', 'vatu', 'vatus', 'vanuatu vatu'],
  },
  {
    code: 'WST',
    name: 'Tala samoano',
    nameEn: 'Samoan Tala',
    variants: ['wst', 'tala', 'talas', 'samoan tala'],
  },
  {
    code: 'XAF',
    name: 'Franco CFA de África Central',
    nameEn: 'Central African CFA Franc',
    variants: ['xaf', 'cfa franc', 'central african franc', 'franco cfa'],
  },
  {
    code: 'XCD',
    name: 'Dólar del Caribe Oriental',
    nameEn: 'East Caribbean Dollar',
    variants: ['xcd', 'east caribbean dollar', 'caribbean dollar', 'dolar caribe'],
  },
  {
    code: 'XDR',
    name: 'Derechos Especiales de Giro',
    nameEn: 'Special Drawing Rights',
    variants: ['xdr', 'sdr', 'special drawing rights', 'derechos especiales'],
  },
  {
    code: 'XOF',
    name: 'Franco CFA de África Occidental',
    nameEn: 'West African CFA Franc',
    variants: ['xof', 'west african franc', 'cfa franc occidental', 'franco cfa occidental'],
  },
  {
    code: 'XPF',
    name: 'Franco CFP',
    nameEn: 'CFP Franc',
    variants: ['xpf', 'cfp franc', 'pacific franc', 'franco cfp'],
  },
  {
    code: 'YER',
    name: 'Rial yemení',
    nameEn: 'Yemeni Rial',
    variants: ['yer', 'yemeni rial', 'yemen rial', 'rial yemeni'],
  },
  {
    code: 'ZAR',
    name: 'Rand sudafricano',
    nameEn: 'South African Rand',
    variants: ['zar', 'rand', 'rands', 'south african rand', 'rand sudafricano'],
  },
  {
    code: 'ZMW',
    name: 'Kwacha zambiano',
    nameEn: 'Zambian Kwacha',
    variants: ['zmw', 'zambian kwacha', 'zambia kwacha', 'kwacha zambiano'],
  },
  {
    code: 'ZWL',
    name: 'Dólar zimbabuense',
    nameEn: 'Zimbabwean Dollar',
    variants: ['zwl', 'zimbabwean dollar', 'zimbabwe dollar', 'dolar zimbabue'],
  },
]

/**
 * Normaliza una cadena de moneda a su código ISO 4217 correspondiente
 * @param input - Cadena de entrada que puede contener el nombre o símbolo de la moneda
 * @returns Código ISO 4217 de 3 letras (EUR por defecto si no se encuentra coincidencia)
 */
export function normalizeCurrencyString(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'EUR' // Moneda por defecto
  }

  const normalized = input.trim().toLowerCase()

  // Buscar coincidencia exacta o parcial en las variantes
  for (const currency of CURRENCIES) {
    if (
      currency.variants.some((variant) => normalized === variant || normalized.includes(variant))
    ) {
      return currency.code
    }
  }

  // Si no se encuentra coincidencia, devolver EUR como moneda por defecto
  return 'EUR'
}

/**
 * Obtiene la información completa de una moneda por su código ISO 4217
 * @param code - Código ISO 4217 de 3 letras
 * @returns Información de la moneda o undefined si no se encuentra
 */
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return CURRENCIES.find((currency) => currency.code === code)
}

/**
 * Obtiene todas las monedas disponibles
 * @returns Array con todas las monedas ISO 4217
 */
export function getAllCurrencies(): CurrencyInfo[] {
  return CURRENCIES
}

/**
 * Obtiene las opciones para un selector de monedas
 * @returns Array de opciones con value, label y searchTerms para el selector
 */
export function getCurrencySelectOptions() {
  return CURRENCIES.map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
    labelEn: `${currency.code} - ${currency.nameEn}`,
    symbol: currency.symbol,
    searchTerms: [
      currency.code.toLowerCase(),
      currency.name.toLowerCase(),
      currency.nameEn.toLowerCase(),
      ...(currency.symbol ? [currency.symbol] : []),
      ...currency.variants,
    ].join(' '),
  }))
}
