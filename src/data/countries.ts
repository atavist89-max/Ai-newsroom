import type { Country, Continent, ContinentCode } from '../types';

export const continents: Record<ContinentCode, Continent> = {
  EU: {
    code: 'EU',
    name: 'Europe',
    bounds: [[36, -25], [71, 45]],
    color: '#3b82f6',
    newsSources: [
      { name: 'BBC Europe', language: 'English' },
      { name: 'Politico EU', language: 'English' },
      { name: 'Euronews', language: 'English' },
      { name: 'DW', language: 'English' },
      { name: 'France 24', language: 'English' },
      { name: 'Reuters Europe', language: 'English' }
    ]
  },
  AS: {
    code: 'AS',
    name: 'Asia',
    bounds: [[-10, 60], [55, 180]],
    color: '#ef4444',
    newsSources: [
      { name: 'BBC Asia', language: 'English' },
      { name: 'Channel News Asia', language: 'English' },
      { name: 'South China Morning Post', language: 'English' },
      { name: 'Nikkei Asia', language: 'English' },
      { name: 'The Diplomat', language: 'English' }
    ]
  },
  ME: {
    code: 'ME',
    name: 'Middle East',
    bounds: [[12, 34], [42, 63]],
    color: '#f59e0b',
    newsSources: [
      { name: 'Al Jazeera', language: 'English' },
      { name: 'Middle East Eye', language: 'English' },
      { name: 'Reuters Middle East', language: 'English' },
      { name: 'BBC Middle East', language: 'English' },
      { name: 'The National', language: 'English' }
    ]
  },
  NA: {
    code: 'NA',
    name: 'North America',
    bounds: [[15, -170], [75, -50]],
    color: '#22c55e',
    newsSources: [
      { name: 'CNN', language: 'English' },
      { name: 'Reuters', language: 'English' },
      { name: 'AP', language: 'English' },
      { name: 'NPR', language: 'English' },
      { name: 'CBC', language: 'English' },
      { name: 'ABC News', language: 'English' }
    ]
  },
  SA: {
    code: 'SA',
    name: 'South America',
    bounds: [[-55, -85], [15, -35]],
    color: '#f97316',
    newsSources: [
      { name: 'BBC Latin America', language: 'English' },
      { name: 'MercoPress', language: 'English' },
      { name: 'Telesur', language: 'Spanish' },
      { name: 'Infobae', language: 'Spanish' }
    ]
  },
  AF: {
    code: 'AF',
    name: 'Africa',
    bounds: [[-35, -20], [38, 55]],
    color: '#a855f7',
    newsSources: [
      { name: 'BBC Africa', language: 'English' },
      { name: 'Africanews', language: 'English' },
      { name: 'Mail & Guardian', language: 'English' },
      { name: 'The Africa Report', language: 'English' }
    ]
  },
  OC: {
    code: 'OC',
    name: 'Oceania',
    bounds: [[-50, 110], [0, 180]],
    color: '#06b6d4',
    newsSources: [
      { name: 'ABC Australia', language: 'English' },
      { name: 'RNZ', language: 'English' },
      { name: 'Fiji Times', language: 'English' },
      { name: 'The Australian', language: 'English' }
    ]
  }
};

export const countries: Country[] = [
  // Europe
  { code: 'AL', name: 'Albania', continent: 'Europe', continentCode: 'EU', center: [41.15, 20.17], zoom: 6, newsSources: ['Albanian Daily News', 'Top Channel'], language: 'Albanian' },
  { code: 'AD', name: 'Andorra', continent: 'Europe', continentCode: 'EU', center: [42.55, 1.60], zoom: 8, newsSources: ["Diari d'Andorra", 'Andorra Difusio'], language: 'Catalan' },
  { code: 'AT', name: 'Austria', continent: 'Europe', continentCode: 'EU', center: [47.52, 14.55], zoom: 6, newsSources: ['Der Standard', 'Die Presse', 'ORF'], language: 'German' },
  { code: 'BY', name: 'Belarus', continent: 'Europe', continentCode: 'EU', center: [53.71, 27.95], zoom: 5, newsSources: ['BelTA', 'TUT.BY'], language: 'Russian' },
  { code: 'BE', name: 'Belgium', continent: 'Europe', continentCode: 'EU', center: [50.85, 4.35], zoom: 7, newsSources: ['De Standaard', 'Le Soir', 'RTBF'], language: 'Dutch' },
  { code: 'BA', name: 'Bosnia and Herzegovina', continent: 'Europe', continentCode: 'EU', center: [43.92, 17.68], zoom: 6, newsSources: ['Dnevni Avaz', 'Klix'], language: 'Bosnian' },
  { code: 'BG', name: 'Bulgaria', continent: 'Europe', continentCode: 'EU', center: [42.73, 25.48], zoom: 6, newsSources: ['Dnevnik', 'Mediapool'], language: 'Bulgarian' },
  { code: 'HR', name: 'Croatia', continent: 'Europe', continentCode: 'EU', center: [45.10, 15.20], zoom: 6, newsSources: ['Jutarnji List', 'Index.hr'], language: 'Croatian' },
  { code: 'CZ', name: 'Czech Republic', continent: 'Europe', continentCode: 'EU', center: [49.82, 15.47], zoom: 6, newsSources: ['iDnes', 'Aktualne'], language: 'Czech' },
  { code: 'DK', name: 'Denmark', continent: 'Europe', continentCode: 'EU', center: [56.26, 9.50], zoom: 6, newsSources: ['Politiken', 'DR'], language: 'Danish' },
  { code: 'EE', name: 'Estonia', continent: 'Europe', continentCode: 'EU', center: [58.60, 25.01], zoom: 6, newsSources: ['Postimees', 'ERR'], language: 'Estonian' },
  { code: 'FI', name: 'Finland', continent: 'Europe', continentCode: 'EU', center: [61.92, 25.75], zoom: 5, newsSources: ['Yle', 'Helsingin Sanomat', 'Ilta-Sanomat'], language: 'Finnish' },
  { code: 'FR', name: 'France', continent: 'Europe', continentCode: 'EU', center: [46.23, 2.21], zoom: 5, newsSources: ['Le Monde', 'Le Figaro', 'France 24'], language: 'French' },
  { code: 'DE', name: 'Germany', continent: 'Europe', continentCode: 'EU', center: [51.17, 10.45], zoom: 5, newsSources: ['Der Spiegel', 'FAZ', 'Deutsche Welle'], language: 'German' },
  { code: 'GR', name: 'Greece', continent: 'Europe', continentCode: 'EU', center: [39.07, 21.82], zoom: 6, newsSources: ['Kathimerini', 'Ta Nea'], language: 'Greek' },
  { code: 'HU', name: 'Hungary', continent: 'Europe', continentCode: 'EU', center: [47.16, 19.50], zoom: 6, newsSources: ['Index.hu', '444.hu'], language: 'Hungarian' },
  { code: 'IS', name: 'Iceland', continent: 'Europe', continentCode: 'EU', center: [64.96, -19.02], zoom: 5, newsSources: ['Morgunbladid', 'RUV'], language: 'Icelandic' },
  { code: 'IE', name: 'Ireland', continent: 'Europe', continentCode: 'EU', center: [53.41, -8.24], zoom: 6, newsSources: ['The Irish Times', 'RTE'], language: 'English' },
  { code: 'IT', name: 'Italy', continent: 'Europe', continentCode: 'EU', center: [41.87, 12.57], zoom: 5, newsSources: ['Corriere della Sera', 'La Repubblica'], language: 'Italian' },
  { code: 'LV', name: 'Latvia', continent: 'Europe', continentCode: 'EU', center: [56.88, 24.60], zoom: 6, newsSources: ['Delfi', 'LSM'], language: 'Latvian' },
  { code: 'LI', name: 'Liechtenstein', continent: 'Europe', continentCode: 'EU', center: [47.14, 9.55], zoom: 9, newsSources: ['Liechtensteiner Vaterland'], language: 'German' },
  { code: 'LT', name: 'Lithuania', continent: 'Europe', continentCode: 'EU', center: [55.17, 23.88], zoom: 6, newsSources: ['Delfi', 'LRT'], language: 'Lithuanian' },
  { code: 'LU', name: 'Luxembourg', continent: 'Europe', continentCode: 'EU', center: [49.61, 6.13], zoom: 8, newsSources: ['Luxembourg Times', 'Le Quotidien'], language: 'Luxembourgish' },
  { code: 'MT', name: 'Malta', continent: 'Europe', continentCode: 'EU', center: [35.94, 14.37], zoom: 8, newsSources: ['Times of Malta', 'Malta Today'], language: 'English' },
  { code: 'MD', name: 'Moldova', continent: 'Europe', continentCode: 'EU', center: [47.41, 28.36], zoom: 6, newsSources: ['Jurnal.md', 'Timpul'], language: 'Romanian' },
  { code: 'MC', name: 'Monaco', continent: 'Europe', continentCode: 'EU', center: [43.73, 7.42], zoom: 10, newsSources: ['Monaco Matin'], language: 'French' },
  { code: 'ME', name: 'Montenegro', continent: 'Europe', continentCode: 'EU', center: [42.70, 19.37], zoom: 7, newsSources: ['Vijesti', 'Dan'], language: 'Montenegrin' },
  { code: 'NL', name: 'Netherlands', continent: 'Europe', continentCode: 'EU', center: [52.13, 5.29], zoom: 6, newsSources: ['NRC', 'De Telegraaf', 'NOS'], language: 'Dutch' },
  { code: 'MK', name: 'North Macedonia', continent: 'Europe', continentCode: 'EU', center: [41.60, 21.75], zoom: 7, newsSources: ['A1on', 'Sitel'], language: 'Macedonian' },
  { code: 'NO', name: 'Norway', continent: 'Europe', continentCode: 'EU', center: [60.47, 8.47], zoom: 5, newsSources: ['Aftenposten', 'NRK'], language: 'Norwegian' },
  { code: 'PL', name: 'Poland', continent: 'Europe', continentCode: 'EU', center: [51.92, 19.14], zoom: 5, newsSources: ['Gazeta Wyborcza', 'Onet', 'TVN24'], language: 'Polish' },
  { code: 'PT', name: 'Portugal', continent: 'Europe', continentCode: 'EU', center: [39.40, -8.22], zoom: 6, newsSources: ['Publico', 'Expresso', 'RTP'], language: 'Portuguese' },
  { code: 'RO', name: 'Romania', continent: 'Europe', continentCode: 'EU', center: [45.94, 24.97], zoom: 5, newsSources: ['HotNews', 'Digi24'], language: 'Romanian' },
  { code: 'RU', name: 'Russia', continent: 'Europe', continentCode: 'EU', center: [61.52, 105.32], zoom: 3, newsSources: ['TASS', 'RIA Novosti'], language: 'Russian' },
  { code: 'SM', name: 'San Marino', continent: 'Europe', continentCode: 'EU', center: [43.94, 12.46], zoom: 9, newsSources: ['San Marino RTV'], language: 'Italian' },
  { code: 'RS', name: 'Serbia', continent: 'Europe', continentCode: 'EU', center: [44.02, 21.00], zoom: 6, newsSources: ['Blic', 'Danas'], language: 'Serbian' },
  { code: 'SK', name: 'Slovakia', continent: 'Europe', continentCode: 'EU', center: [48.67, 19.70], zoom: 6, newsSources: ['SME', 'Pravda'], language: 'Slovak' },
  { code: 'SI', name: 'Slovenia', continent: 'Europe', continentCode: 'EU', center: [46.15, 14.99], zoom: 7, newsSources: ['Delo', 'RTV Slovenija'], language: 'Slovenian' },
  { code: 'ES', name: 'Spain', continent: 'Europe', continentCode: 'EU', center: [40.46, -3.75], zoom: 5, newsSources: ['El Pais', 'El Mundo', 'RTVE'], language: 'Spanish' },
  { code: 'SE', name: 'Sweden', continent: 'Europe', continentCode: 'EU', center: [60.13, 18.64], zoom: 5, newsSources: ['Dagens Nyheter', 'SVT', 'Aftonbladet'], language: 'Swedish' },
  { code: 'CH', name: 'Switzerland', continent: 'Europe', continentCode: 'EU', center: [46.82, 8.23], zoom: 6, newsSources: ['NZZ', '20 Minuten', 'RTS'], language: 'German' },
  { code: 'UA', name: 'Ukraine', continent: 'Europe', continentCode: 'EU', center: [48.38, 31.17], zoom: 5, newsSources: ['Ukrainska Pravda', 'Hromadske'], language: 'Ukrainian' },
  { code: 'GB', name: 'United Kingdom', continent: 'Europe', continentCode: 'EU', center: [55.38, -3.44], zoom: 5, newsSources: ['BBC', 'The Guardian', 'The Times'], language: 'English' },
  { code: 'VA', name: 'Vatican City', continent: 'Europe', continentCode: 'EU', center: [41.90, 12.45], zoom: 11, newsSources: ['Vatican News'], language: 'Italian' }
];

export const getContinentByCode = (code: ContinentCode): Continent => continents[code];
export const getCountryByCode = (code: string): Country | undefined => countries.find(c => c.code === code);
