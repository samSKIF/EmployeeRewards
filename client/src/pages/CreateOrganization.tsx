import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  createOrganizationSchema,
  type CreateOrganizationData,
} from '@shared/schema';
import {
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ArrowLeft,
} from 'lucide-react';

interface CreateOrganizationProps {
  onClose?: () => void;
}

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'nonprofit', label: 'Non-Profit' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const COUNTRIES = [
  { value: 'AF', label: 'Afghanistan', states: [] },
  { value: 'AL', label: 'Albania', states: [] },
  { value: 'DZ', label: 'Algeria', states: [] },
  { value: 'AS', label: 'American Samoa', states: [] },
  { value: 'AD', label: 'Andorra', states: [] },
  { value: 'AO', label: 'Angola', states: [] },
  { value: 'AI', label: 'Anguilla', states: [] },
  { value: 'AQ', label: 'Antarctica', states: [] },
  { value: 'AG', label: 'Antigua and Barbuda', states: [] },
  {
    value: 'AR',
    label: 'Argentina',
    states: [
      'Buenos Aires',
      'Catamarca',
      'Chaco',
      'Chubut',
      'Córdoba',
      'Corrientes',
      'Entre Ríos',
      'Formosa',
      'Jujuy',
      'La Pampa',
      'La Rioja',
      'Mendoza',
      'Misiones',
      'Neuquén',
      'Río Negro',
      'Salta',
      'San Juan',
      'San Luis',
      'Santa Cruz',
      'Santa Fe',
      'Santiago del Estero',
      'Tierra del Fuego',
      'Tucumán',
    ],
  },
  { value: 'AM', label: 'Armenia', states: [] },
  { value: 'AW', label: 'Aruba', states: [] },
  {
    value: 'AU',
    label: 'Australia',
    states: [
      'New South Wales',
      'Victoria',
      'Queensland',
      'Western Australia',
      'South Australia',
      'Tasmania',
      'Northern Territory',
      'Australian Capital Territory',
    ],
  },
  {
    value: 'AT',
    label: 'Austria',
    states: [
      'Burgenland',
      'Carinthia',
      'Lower Austria',
      'Upper Austria',
      'Salzburg',
      'Styria',
      'Tyrol',
      'Vorarlberg',
      'Vienna',
    ],
  },
  { value: 'AZ', label: 'Azerbaijan', states: [] },
  { value: 'BS', label: 'Bahamas', states: [] },
  { value: 'BH', label: 'Bahrain', states: [] },
  { value: 'BD', label: 'Bangladesh', states: [] },
  { value: 'BB', label: 'Barbados', states: [] },
  { value: 'BY', label: 'Belarus', states: [] },
  {
    value: 'BE',
    label: 'Belgium',
    states: ['Flanders', 'Wallonia', 'Brussels-Capital Region'],
  },
  { value: 'BZ', label: 'Belize', states: [] },
  { value: 'BJ', label: 'Benin', states: [] },
  { value: 'BM', label: 'Bermuda', states: [] },
  { value: 'BT', label: 'Bhutan', states: [] },
  { value: 'BO', label: 'Bolivia', states: [] },
  { value: 'BA', label: 'Bosnia and Herzegovina', states: [] },
  { value: 'BW', label: 'Botswana', states: [] },
  { value: 'BV', label: 'Bouvet Island', states: [] },
  {
    value: 'BR',
    label: 'Brazil',
    states: [
      'Acre',
      'Alagoas',
      'Amapá',
      'Amazonas',
      'Bahia',
      'Ceará',
      'Distrito Federal',
      'Espírito Santo',
      'Goiás',
      'Maranhão',
      'Mato Grosso',
      'Mato Grosso do Sul',
      'Minas Gerais',
      'Pará',
      'Paraíba',
      'Paraná',
      'Pernambuco',
      'Piauí',
      'Rio de Janeiro',
      'Rio Grande do Norte',
      'Rio Grande do Sul',
      'Rondônia',
      'Roraima',
      'Santa Catarina',
      'São Paulo',
      'Sergipe',
      'Tocantins',
    ],
  },
  { value: 'IO', label: 'British Indian Ocean Territory', states: [] },
  { value: 'BN', label: 'Brunei Darussalam', states: [] },
  { value: 'BG', label: 'Bulgaria', states: [] },
  { value: 'BF', label: 'Burkina Faso', states: [] },
  { value: 'BI', label: 'Burundi', states: [] },
  { value: 'KH', label: 'Cambodia', states: [] },
  { value: 'CM', label: 'Cameroon', states: [] },
  {
    value: 'CA',
    label: 'Canada',
    states: [
      'Alberta',
      'British Columbia',
      'Manitoba',
      'New Brunswick',
      'Newfoundland and Labrador',
      'Northwest Territories',
      'Nova Scotia',
      'Nunavut',
      'Ontario',
      'Prince Edward Island',
      'Quebec',
      'Saskatchewan',
      'Yukon',
    ],
  },
  { value: 'CV', label: 'Cape Verde', states: [] },
  { value: 'KY', label: 'Cayman Islands', states: [] },
  { value: 'CF', label: 'Central African Republic', states: [] },
  { value: 'TD', label: 'Chad', states: [] },
  { value: 'CL', label: 'Chile', states: [] },
  {
    value: 'CN',
    label: 'China',
    states: [
      'Beijing',
      'Tianjin',
      'Hebei',
      'Shanxi',
      'Inner Mongolia',
      'Liaoning',
      'Jilin',
      'Heilongjiang',
      'Shanghai',
      'Jiangsu',
      'Zhejiang',
      'Anhui',
      'Fujian',
      'Jiangxi',
      'Shandong',
      'Henan',
      'Hubei',
      'Hunan',
      'Guangdong',
      'Guangxi',
      'Hainan',
      'Chongqing',
      'Sichuan',
      'Guizhou',
      'Yunnan',
      'Tibet',
      'Shaanxi',
      'Gansu',
      'Qinghai',
      'Ningxia',
      'Xinjiang',
    ],
  },
  { value: 'CX', label: 'Christmas Island', states: [] },
  { value: 'CC', label: 'Cocos (Keeling) Islands', states: [] },
  { value: 'CO', label: 'Colombia', states: [] },
  { value: 'KM', label: 'Comoros', states: [] },
  { value: 'CG', label: 'Congo', states: [] },
  { value: 'CD', label: 'Congo, Democratic Republic', states: [] },
  { value: 'CK', label: 'Cook Islands', states: [] },
  { value: 'CR', label: 'Costa Rica', states: [] },
  { value: 'CI', label: "Côte d'Ivoire", states: [] },
  { value: 'HR', label: 'Croatia', states: [] },
  { value: 'CU', label: 'Cuba', states: [] },
  { value: 'CY', label: 'Cyprus', states: [] },
  { value: 'CZ', label: 'Czech Republic', states: [] },
  { value: 'DK', label: 'Denmark', states: [] },
  { value: 'DJ', label: 'Djibouti', states: [] },
  { value: 'DM', label: 'Dominica', states: [] },
  { value: 'DO', label: 'Dominican Republic', states: [] },
  { value: 'EC', label: 'Ecuador', states: [] },
  { value: 'EG', label: 'Egypt', states: [] },
  { value: 'SV', label: 'El Salvador', states: [] },
  { value: 'GQ', label: 'Equatorial Guinea', states: [] },
  { value: 'ER', label: 'Eritrea', states: [] },
  { value: 'EE', label: 'Estonia', states: [] },
  { value: 'ET', label: 'Ethiopia', states: [] },
  { value: 'FK', label: 'Falkland Islands', states: [] },
  { value: 'FO', label: 'Faroe Islands', states: [] },
  { value: 'FJ', label: 'Fiji', states: [] },
  { value: 'FI', label: 'Finland', states: [] },
  {
    value: 'FR',
    label: 'France',
    states: [
      'Auvergne-Rhône-Alpes',
      'Bourgogne-Franche-Comté',
      'Brittany',
      'Centre-Val de Loire',
      'Corsica',
      'Grand Est',
      'Hauts-de-France',
      'Île-de-France',
      'Normandy',
      'Nouvelle-Aquitaine',
      'Occitania',
      'Pays de la Loire',
      "Provence-Alpes-Côte d'Azur",
    ],
  },
  { value: 'GF', label: 'French Guiana', states: [] },
  { value: 'PF', label: 'French Polynesia', states: [] },
  { value: 'TF', label: 'French Southern Territories', states: [] },
  { value: 'GA', label: 'Gabon', states: [] },
  { value: 'GM', label: 'Gambia', states: [] },
  { value: 'GE', label: 'Georgia', states: [] },
  {
    value: 'DE',
    label: 'Germany',
    states: [
      'Baden-Württemberg',
      'Bavaria',
      'Berlin',
      'Brandenburg',
      'Bremen',
      'Hamburg',
      'Hesse',
      'Lower Saxony',
      'Mecklenburg-Vorpommern',
      'North Rhine-Westphalia',
      'Rhineland-Palatinate',
      'Saarland',
      'Saxony',
      'Saxony-Anhalt',
      'Schleswig-Holstein',
      'Thuringia',
    ],
  },
  { value: 'GH', label: 'Ghana', states: [] },
  { value: 'GI', label: 'Gibraltar', states: [] },
  { value: 'GR', label: 'Greece', states: [] },
  { value: 'GL', label: 'Greenland', states: [] },
  { value: 'GD', label: 'Grenada', states: [] },
  { value: 'GP', label: 'Guadeloupe', states: [] },
  { value: 'GU', label: 'Guam', states: [] },
  { value: 'GT', label: 'Guatemala', states: [] },
  { value: 'GG', label: 'Guernsey', states: [] },
  { value: 'GN', label: 'Guinea', states: [] },
  { value: 'GW', label: 'Guinea-Bissau', states: [] },
  { value: 'GY', label: 'Guyana', states: [] },
  { value: 'HT', label: 'Haiti', states: [] },
  { value: 'HM', label: 'Heard Island & McDonald Islands', states: [] },
  { value: 'VA', label: 'Holy See (Vatican City State)', states: [] },
  { value: 'HN', label: 'Honduras', states: [] },
  { value: 'HK', label: 'Hong Kong', states: [] },
  { value: 'HU', label: 'Hungary', states: [] },
  { value: 'IS', label: 'Iceland', states: [] },
  {
    value: 'IN',
    label: 'India',
    states: [
      'Andhra Pradesh',
      'Arunachal Pradesh',
      'Assam',
      'Bihar',
      'Chhattisgarh',
      'Goa',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
      'Jharkhand',
      'Karnataka',
      'Kerala',
      'Madhya Pradesh',
      'Maharashtra',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Odisha',
      'Punjab',
      'Rajasthan',
      'Sikkim',
      'Tamil Nadu',
      'Telangana',
      'Tripura',
      'Uttar Pradesh',
      'Uttarakhand',
      'West Bengal',
    ],
  },
  { value: 'ID', label: 'Indonesia', states: [] },
  { value: 'IR', label: 'Iran', states: [] },
  { value: 'IQ', label: 'Iraq', states: [] },
  { value: 'IE', label: 'Ireland', states: [] },
  { value: 'IM', label: 'Isle of Man', states: [] },
  { value: 'IL', label: 'Israel', states: [] },
  { value: 'IT', label: 'Italy', states: [] },
  { value: 'JM', label: 'Jamaica', states: [] },
  {
    value: 'JP',
    label: 'Japan',
    states: [
      'Hokkaido',
      'Aomori',
      'Iwate',
      'Miyagi',
      'Akita',
      'Yamagata',
      'Fukushima',
      'Ibaraki',
      'Tochigi',
      'Gunma',
      'Saitama',
      'Chiba',
      'Tokyo',
      'Kanagawa',
      'Niigata',
      'Toyama',
      'Ishikawa',
      'Fukui',
      'Yamanashi',
      'Nagano',
      'Gifu',
      'Shizuoka',
      'Aichi',
      'Mie',
      'Shiga',
      'Kyoto',
      'Osaka',
      'Hyogo',
      'Nara',
      'Wakayama',
      'Tottori',
      'Shimane',
      'Okayama',
      'Hiroshima',
      'Yamaguchi',
      'Tokushima',
      'Kagawa',
      'Ehime',
      'Kochi',
      'Fukuoka',
      'Saga',
      'Nagasaki',
      'Kumamoto',
      'Oita',
      'Miyazaki',
      'Kagoshima',
      'Okinawa',
    ],
  },
  { value: 'JE', label: 'Jersey', states: [] },
  { value: 'JO', label: 'Jordan', states: [] },
  { value: 'KZ', label: 'Kazakhstan', states: [] },
  { value: 'KE', label: 'Kenya', states: [] },
  { value: 'KI', label: 'Kiribati', states: [] },
  { value: 'KP', label: "Korea, Democratic People's Republic of", states: [] },
  { value: 'KR', label: 'Korea, Republic of', states: [] },
  { value: 'KW', label: 'Kuwait', states: [] },
  { value: 'KG', label: 'Kyrgyzstan', states: [] },
  { value: 'LA', label: "Lao People's Democratic Republic", states: [] },
  { value: 'LV', label: 'Latvia', states: [] },
  { value: 'LB', label: 'Lebanon', states: [] },
  { value: 'LS', label: 'Lesotho', states: [] },
  { value: 'LR', label: 'Liberia', states: [] },
  { value: 'LY', label: 'Libya', states: [] },
  { value: 'LI', label: 'Liechtenstein', states: [] },
  { value: 'LT', label: 'Lithuania', states: [] },
  { value: 'LU', label: 'Luxembourg', states: [] },
  { value: 'MO', label: 'Macao', states: [] },
  { value: 'MK', label: 'Macedonia', states: [] },
  { value: 'MG', label: 'Madagascar', states: [] },
  { value: 'MW', label: 'Malawi', states: [] },
  { value: 'MY', label: 'Malaysia', states: [] },
  { value: 'MV', label: 'Maldives', states: [] },
  { value: 'ML', label: 'Mali', states: [] },
  { value: 'MT', label: 'Malta', states: [] },
  { value: 'MH', label: 'Marshall Islands', states: [] },
  { value: 'MQ', label: 'Martinique', states: [] },
  { value: 'MR', label: 'Mauritania', states: [] },
  { value: 'MU', label: 'Mauritius', states: [] },
  { value: 'YT', label: 'Mayotte', states: [] },
  {
    value: 'MX',
    label: 'Mexico',
    states: [
      'Aguascalientes',
      'Baja California',
      'Baja California Sur',
      'Campeche',
      'Chiapas',
      'Chihuahua',
      'Coahuila',
      'Colima',
      'Durango',
      'Guanajuato',
      'Guerrero',
      'Hidalgo',
      'Jalisco',
      'México',
      'Michoacán',
      'Morelos',
      'Nayarit',
      'Nuevo León',
      'Oaxaca',
      'Puebla',
      'Querétaro',
      'Quintana Roo',
      'San Luis Potosí',
      'Sinaloa',
      'Sonora',
      'Tabasco',
      'Tamaulipas',
      'Tlaxcala',
      'Veracruz',
      'Yucatán',
      'Zacatecas',
    ],
  },
  { value: 'FM', label: 'Micronesia, Federated States of', states: [] },
  { value: 'MD', label: 'Moldova', states: [] },
  { value: 'MC', label: 'Monaco', states: [] },
  { value: 'MN', label: 'Mongolia', states: [] },
  { value: 'ME', label: 'Montenegro', states: [] },
  { value: 'MS', label: 'Montserrat', states: [] },
  { value: 'MA', label: 'Morocco', states: [] },
  { value: 'MZ', label: 'Mozambique', states: [] },
  { value: 'MM', label: 'Myanmar', states: [] },
  { value: 'NA', label: 'Namibia', states: [] },
  { value: 'NR', label: 'Nauru', states: [] },
  { value: 'NP', label: 'Nepal', states: [] },
  { value: 'NL', label: 'Netherlands', states: [] },
  { value: 'AN', label: 'Netherlands Antilles', states: [] },
  { value: 'NC', label: 'New Caledonia', states: [] },
  { value: 'NZ', label: 'New Zealand', states: [] },
  { value: 'NI', label: 'Nicaragua', states: [] },
  { value: 'NE', label: 'Niger', states: [] },
  { value: 'NG', label: 'Nigeria', states: [] },
  { value: 'NU', label: 'Niue', states: [] },
  { value: 'NF', label: 'Norfolk Island', states: [] },
  { value: 'MP', label: 'Northern Mariana Islands', states: [] },
  { value: 'NO', label: 'Norway', states: [] },
  { value: 'OM', label: 'Oman', states: [] },
  { value: 'PK', label: 'Pakistan', states: [] },
  { value: 'PW', label: 'Palau', states: [] },
  { value: 'PS', label: 'Palestinian Territory, Occupied', states: [] },
  { value: 'PA', label: 'Panama', states: [] },
  { value: 'PG', label: 'Papua New Guinea', states: [] },
  { value: 'PY', label: 'Paraguay', states: [] },
  { value: 'PE', label: 'Peru', states: [] },
  { value: 'PH', label: 'Philippines', states: [] },
  { value: 'PN', label: 'Pitcairn', states: [] },
  { value: 'PL', label: 'Poland', states: [] },
  { value: 'PT', label: 'Portugal', states: [] },
  { value: 'PR', label: 'Puerto Rico', states: [] },
  { value: 'QA', label: 'Qatar', states: [] },
  { value: 'RE', label: 'Réunion', states: [] },
  { value: 'RO', label: 'Romania', states: [] },
  { value: 'RU', label: 'Russian Federation', states: [] },
  { value: 'RW', label: 'Rwanda', states: [] },
  { value: 'BL', label: 'Saint Barthélemy', states: [] },
  { value: 'SH', label: 'Saint Helena', states: [] },
  { value: 'KN', label: 'Saint Kitts and Nevis', states: [] },
  { value: 'LC', label: 'Saint Lucia', states: [] },
  { value: 'MF', label: 'Saint Martin', states: [] },
  { value: 'PM', label: 'Saint Pierre and Miquelon', states: [] },
  { value: 'VC', label: 'Saint Vincent and the Grenadines', states: [] },
  { value: 'WS', label: 'Samoa', states: [] },
  { value: 'SM', label: 'San Marino', states: [] },
  { value: 'ST', label: 'Sao Tome and Principe', states: [] },
  { value: 'SA', label: 'Saudi Arabia', states: [] },
  { value: 'SN', label: 'Senegal', states: [] },
  { value: 'RS', label: 'Serbia', states: [] },
  { value: 'SC', label: 'Seychelles', states: [] },
  { value: 'SL', label: 'Sierra Leone', states: [] },
  { value: 'SG', label: 'Singapore', states: [] },
  { value: 'SK', label: 'Slovakia', states: [] },
  { value: 'SI', label: 'Slovenia', states: [] },
  { value: 'SB', label: 'Solomon Islands', states: [] },
  { value: 'SO', label: 'Somalia', states: [] },
  { value: 'ZA', label: 'South Africa', states: [] },
  {
    value: 'GS',
    label: 'South Georgia and the South Sandwich Islands',
    states: [],
  },
  { value: 'ES', label: 'Spain', states: [] },
  { value: 'LK', label: 'Sri Lanka', states: [] },
  { value: 'SD', label: 'Sudan', states: [] },
  { value: 'SR', label: 'Suriname', states: [] },
  { value: 'SJ', label: 'Svalbard and Jan Mayen', states: [] },
  { value: 'SZ', label: 'Swaziland', states: [] },
  { value: 'SE', label: 'Sweden', states: [] },
  { value: 'CH', label: 'Switzerland', states: [] },
  { value: 'SY', label: 'Syrian Arab Republic', states: [] },
  { value: 'TW', label: 'Taiwan', states: [] },
  { value: 'TJ', label: 'Tajikistan', states: [] },
  { value: 'TZ', label: 'Tanzania', states: [] },
  { value: 'TH', label: 'Thailand', states: [] },
  { value: 'TL', label: 'Timor-Leste', states: [] },
  { value: 'TG', label: 'Togo', states: [] },
  { value: 'TK', label: 'Tokelau', states: [] },
  { value: 'TO', label: 'Tonga', states: [] },
  { value: 'TT', label: 'Trinidad and Tobago', states: [] },
  { value: 'TN', label: 'Tunisia', states: [] },
  { value: 'TR', label: 'Turkey', states: [] },
  { value: 'TM', label: 'Turkmenistan', states: [] },
  { value: 'TC', label: 'Turks and Caicos Islands', states: [] },
  { value: 'TV', label: 'Tuvalu', states: [] },
  { value: 'UG', label: 'Uganda', states: [] },
  { value: 'UA', label: 'Ukraine', states: [] },
  { value: 'AE', label: 'United Arab Emirates', states: [] },
  {
    value: 'GB',
    label: 'United Kingdom',
    states: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  },
  {
    value: 'US',
    label: 'United States',
    states: [
      'Alabama',
      'Alaska',
      'Arizona',
      'Arkansas',
      'California',
      'Colorado',
      'Connecticut',
      'Delaware',
      'Florida',
      'Georgia',
      'Hawaii',
      'Idaho',
      'Illinois',
      'Indiana',
      'Iowa',
      'Kansas',
      'Kentucky',
      'Louisiana',
      'Maine',
      'Maryland',
      'Massachusetts',
      'Michigan',
      'Minnesota',
      'Mississippi',
      'Missouri',
      'Montana',
      'Nebraska',
      'Nevada',
      'New Hampshire',
      'New Jersey',
      'New Mexico',
      'New York',
      'North Carolina',
      'North Dakota',
      'Ohio',
      'Oklahoma',
      'Oregon',
      'Pennsylvania',
      'Rhode Island',
      'South Carolina',
      'South Dakota',
      'Tennessee',
      'Texas',
      'Utah',
      'Vermont',
      'Virginia',
      'Washington',
      'West Virginia',
      'Wisconsin',
      'Wyoming',
    ],
  },
  { value: 'UM', label: 'United States Minor Outlying Islands', states: [] },
  { value: 'UY', label: 'Uruguay', states: [] },
  { value: 'UZ', label: 'Uzbekistan', states: [] },
  { value: 'VU', label: 'Vanuatu', states: [] },
  { value: 'VE', label: 'Venezuela', states: [] },
  { value: 'VN', label: 'Viet Nam', states: [] },
  { value: 'VG', label: 'Virgin Islands, British', states: [] },
  { value: 'VI', label: 'Virgin Islands, U.S.', states: [] },
  { value: 'WF', label: 'Wallis and Futuna', states: [] },
  { value: 'EH', label: 'Western Sahara', states: [] },
  { value: 'YE', label: 'Yemen', states: [] },
  { value: 'ZM', label: 'Zambia', states: [] },
  { value: 'ZW', label: 'Zimbabwe', states: [] },
];

const MAJOR_CITIES = {
  US: [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
    'San Jose',
  ],
  CA: [
    'Toronto',
    'Montreal',
    'Vancouver',
    'Calgary',
    'Edmonton',
    'Ottawa',
    'Winnipeg',
    'Quebec City',
    'Hamilton',
    'Kitchener',
  ],
  GB: [
    'London',
    'Birmingham',
    'Manchester',
    'Glasgow',
    'Liverpool',
    'Leeds',
    'Sheffield',
    'Edinburgh',
    'Bristol',
    'Cardiff',
  ],
  AU: [
    'Sydney',
    'Melbourne',
    'Brisbane',
    'Perth',
    'Adelaide',
    'Gold Coast',
    'Newcastle',
    'Canberra',
    'Sunshine Coast',
    'Wollongong',
  ],
  DE: [
    'Berlin',
    'Hamburg',
    'Munich',
    'Cologne',
    'Frankfurt',
    'Stuttgart',
    'Düsseldorf',
    'Dortmund',
    'Essen',
    'Leipzig',
  ],
  FR: [
    'Paris',
    'Marseille',
    'Lyon',
    'Toulouse',
    'Nice',
    'Nantes',
    'Strasbourg',
    'Montpellier',
    'Bordeaux',
    'Lille',
  ],
  IN: [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Ahmedabad',
    'Jaipur',
    'Surat',
  ],
  JP: [
    'Tokyo',
    'Yokohama',
    'Osaka',
    'Nagoya',
    'Sapporo',
    'Fukuoka',
    'Kobe',
    'Kyoto',
    'Kawasaki',
    'Saitama',
  ],
  BR: [
    'São Paulo',
    'Rio de Janeiro',
    'Brasília',
    'Salvador',
    'Fortaleza',
    'Belo Horizonte',
    'Manaus',
    'Curitiba',
    'Recife',
    'Porto Alegre',
  ],
  MX: [
    'Mexico City',
    'Guadalajara',
    'Monterrey',
    'Puebla',
    'Tijuana',
    'León',
    'Juárez',
    'Torreón',
    'Querétaro',
    'San Luis Potosí',
  ],
  CN: [
    'Beijing',
    'Shanghai',
    'Guangzhou',
    'Shenzhen',
    'Tianjin',
    'Wuhan',
    'Dongguan',
    'Chengdu',
    'Nanjing',
    'Chongqing',
  ],
  IT: [
    'Rome',
    'Milan',
    'Naples',
    'Turin',
    'Palermo',
    'Genoa',
    'Bologna',
    'Florence',
    'Bari',
    'Catania',
  ],
  ES: [
    'Madrid',
    'Barcelona',
    'Valencia',
    'Seville',
    'Zaragoza',
    'Málaga',
    'Murcia',
    'Palma',
    'Las Palmas',
    'Bilbao',
  ],
  RU: [
    'Moscow',
    'Saint Petersburg',
    'Novosibirsk',
    'Yekaterinburg',
    'Nizhny Novgorod',
    'Kazan',
    'Chelyabinsk',
    'Omsk',
    'Samara',
    'Rostov-on-Don',
  ],
  KR: [
    'Seoul',
    'Busan',
    'Incheon',
    'Daegu',
    'Daejeon',
    'Gwangju',
    'Suwon',
    'Ulsan',
    'Changwon',
    'Goyang',
  ],
  AR: [
    'Buenos Aires',
    'Córdoba',
    'Rosario',
    'Mendoza',
    'La Plata',
    'Tucumán',
    'Mar del Plata',
    'Salta',
    'Santa Fe',
    'San Juan',
  ],
  ZA: [
    'Johannesburg',
    'Cape Town',
    'Durban',
    'Pretoria',
    'Port Elizabeth',
    'Bloemfontein',
    'East London',
    'Nelspruit',
    'Kimberley',
    'Polokwane',
  ],
  TR: [
    'Istanbul',
    'Ankara',
    'Izmir',
    'Bursa',
    'Adana',
    'Gaziantep',
    'Konya',
    'Antalya',
    'Kayseri',
    'Mersin',
  ],
  EG: [
    'Cairo',
    'Alexandria',
    'Giza',
    'Shubra El-Kheima',
    'Port Said',
    'Suez',
    'Luxor',
    'Mansoura',
    'El-Mahalla El-Kubra',
    'Tanta',
  ],
  TH: [
    'Bangkok',
    'Nonthaburi',
    'Pak Kret',
    'Hat Yai',
    'Chiang Mai',
    'Phuket',
    'Pattaya',
    'Udon Thani',
    'Nakhon Ratchasima',
    'Khon Kaen',
  ],
  PL: [
    'Warsaw',
    'Kraków',
    'Łódź',
    'Wrocław',
    'Poznań',
    'Gdańsk',
    'Szczecin',
    'Bydgoszcz',
    'Lublin',
    'Katowice',
  ],
  NL: [
    'Amsterdam',
    'Rotterdam',
    'The Hague',
    'Utrecht',
    'Eindhoven',
    'Tilburg',
    'Groningen',
    'Almere',
    'Breda',
    'Nijmegen',
  ],
  BE: [
    'Brussels',
    'Antwerp',
    'Ghent',
    'Charleroi',
    'Liège',
    'Bruges',
    'Namur',
    'Leuven',
    'Mons',
    'Aalst',
  ],
  SE: [
    'Stockholm',
    'Gothenburg',
    'Malmö',
    'Uppsala',
    'Västerås',
    'Örebro',
    'Linköping',
    'Helsingborg',
    'Jönköping',
    'Norrköping',
  ],
  NO: [
    'Oslo',
    'Bergen',
    'Stavanger',
    'Trondheim',
    'Drammen',
    'Fredrikstad',
    'Kristiansand',
    'Sandnes',
    'Tromsø',
    'Sarpsborg',
  ],
  CH: [
    'Zurich',
    'Geneva',
    'Basel',
    'Lausanne',
    'Bern',
    'Winterthur',
    'Lucerne',
    'St. Gallen',
    'Lugano',
    'Biel/Bienne',
  ],
  AT: [
    'Vienna',
    'Graz',
    'Linz',
    'Salzburg',
    'Innsbruck',
    'Klagenfurt',
    'Villach',
    'Wels',
    'Sankt Pölten',
    'Dornbirn',
  ],
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreateOrganization({
  onClose,
}: CreateOrganizationProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Update available states and cities when country changes
  useEffect(() => {
    const country = COUNTRIES.find((c) => c.value === selectedCountry);
    if (country) {
      setAvailableStates(country.states);
      setAvailableCities(
        MAJOR_CITIES[selectedCountry as keyof typeof MAJOR_CITIES] || []
      );
    } else {
      setAvailableStates([]);
      setAvailableCities([]);
    }
  }, [selectedCountry]);

  const form = useForm<CreateOrganizationData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      superuserEmail: '',
      maxUsers: 50,
      industry: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zip: '',
      },
    },
  });

  const createOrganizationMutation = useMutation({
    mutationFn: async (data: CreateOrganizationData) => {
      const slug = generateSlug(data.name);

      const organizationData = {
        name: data.name,
        slug,
        type: 'client', // Default to client organization
        status: 'active',
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        superuserEmail: data.superuserEmail,
        maxUsers: data.maxUsers,
        industry: data.industry,
        address: data.address,
      };

      const response = await fetch('/api/management/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('managementToken')}`,
        },
        body: JSON.stringify(organizationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create organization');
      }

      return await response.json();
    },
    onSuccess: (response) => {
      toast({
        title: 'Organization Created',
        description: `${form.getValues('name')} has been successfully created with a superuser account.`,
      });

      // Invalidate organizations query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['/api/management/organizations'],
      });

      // Close the form or redirect
      if (onClose) {
        onClose();
      } else {
        setLocation('/management');
      }
    },
    onError: (error: any) => {
      console.error('Error creating organization:', error);
      toast({
        title: 'Creation Failed',
        description:
          error.message || 'Failed to create organization. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateOrganizationData) => {
    createOrganizationMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => (onClose ? onClose() : setLocation('/management'))}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create New Organization
              </h1>
              <p className="text-gray-600">
                Set up a new tenant organization with initial admin user
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Organization Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Organization Details</span>
                </CardTitle>
                <CardDescription>
                  Basic information about the organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRY_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Contact Information</span>
                </CardTitle>
                <CardDescription>
                  Primary contact details for this organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="contact@acme.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="superuserEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Superuser Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="admin@acme.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-500">
                          Initial admin user will be created with this email
                        </p>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Organization Address</span>
                </CardTitle>
                <CardDescription>
                  Physical address for the organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Business Ave, Suite 100"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="address.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedCountry(value);
                            // Reset state and city when country changes
                            form.setValue('address.state', '');
                            form.setValue('address.city', '');
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem
                                key={country.value}
                                value={country.value}
                              >
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province *</FormLabel>
                        {availableStates.length > 0 ? (
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!selectedCountry}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state/province" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableStates.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input
                              placeholder="Enter state/province"
                              {...field}
                              disabled={!selectedCountry}
                            />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        {availableCities.length > 0 ? (
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!selectedCountry}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select city" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableCities.map((city) => (
                                <SelectItem key={city} value={city}>
                                  {city}
                                </SelectItem>
                              ))}
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input
                              placeholder="Enter city"
                              {...field}
                              disabled={!selectedCountry}
                            />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address.zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP/Postal Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="94105" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onClose ? onClose() : setLocation('/management')
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createOrganizationMutation.isPending}
                className="min-w-[120px]"
              >
                {createOrganizationMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Create Organization
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
