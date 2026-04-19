import type { Topic } from '../types';

export const availableTopics: Topic[] = [
  'General News',
  'Economy',
  'Entertainment',
  'Politics',
  'Society',
  'Sport',
  'Technology',
  'Crime'
];

export const topicSearchTerms: Record<string, Record<Topic, string>> = {
  'English': {
    'General News': 'news',
    'Economy': 'economy',
    'Entertainment': 'entertainment',
    'Politics': 'politics',
    'Society': 'society',
    'Sport': 'sport',
    'Technology': 'technology',
    'Crime': 'crime'
  },
  'Swedish': {
    'General News': 'nyheter',
    'Economy': 'ekonomi',
    'Entertainment': 'underhallning',
    'Politics': 'politik',
    'Society': 'samhalle',
    'Sport': 'sport',
    'Technology': 'teknik',
    'Crime': 'brott'
  },
  'Spanish': {
    'General News': 'noticias',
    'Economy': 'economia',
    'Entertainment': 'entretenimiento',
    'Politics': 'politica',
    'Society': 'sociedad',
    'Sport': 'deportes',
    'Technology': 'tecnologia',
    'Crime': 'crimen'
  },
  'German': {
    'General News': 'nachrichten',
    'Economy': 'wirtschaft',
    'Entertainment': 'unterhaltung',
    'Politics': 'politik',
    'Society': 'gesellschaft',
    'Sport': 'sport',
    'Technology': 'technologie',
    'Crime': 'kriminalitat'
  },
  'French': {
    'General News': 'actualites',
    'Economy': 'economie',
    'Entertainment': 'divertissement',
    'Politics': 'politique',
    'Society': 'societe',
    'Sport': 'sport',
    'Technology': 'technologie',
    'Crime': 'crime'
  },
  'Portuguese': {
    'General News': 'noticias',
    'Economy': 'economia',
    'Entertainment': 'entretenimento',
    'Politics': 'politica',
    'Society': 'sociedade',
    'Sport': 'esportes',
    'Technology': 'tecnologia',
    'Crime': 'crime'
  },
  'Italian': {
    'General News': 'notizie',
    'Economy': 'economia',
    'Entertainment': 'intrattenimento',
    'Politics': 'politica',
    'Society': 'societa',
    'Sport': 'sport',
    'Technology': 'tecnologia',
    'Crime': 'crimine'
  },
  'Dutch': {
    'General News': 'nieuws',
    'Economy': 'economie',
    'Entertainment': 'entertainment',
    'Politics': 'politiek',
    'Society': 'maatschappij',
    'Sport': 'sport',
    'Technology': 'technologie',
    'Crime': 'misdaad'
  },
  'Russian': {
    'General News': 'novosti',
    'Economy': 'ekonomika',
    'Entertainment': 'razvlecheniya',
    'Politics': 'politika',
    'Society': 'obshchestvo',
    'Sport': 'sport',
    'Technology': 'tekhnologii',
    'Crime': 'prestuplenie'
  },
  'Arabic': {
    'General News': 'akhbar',
    'Economy': 'iqtisad',
    'Entertainment': 'tarfih',
    'Politics': 'siyasa',
    'Society': 'mujtama',
    'Sport': 'riyada',
    'Technology': 'tiknulujia',
    'Crime': 'jarima'
  },
  'Japanese': {
    'General News': 'nyusu',
    'Economy': 'keizai',
    'Entertainment': 'entame',
    'Politics': 'seiji',
    'Society': 'shakai',
    'Sport': 'supotsu',
    'Technology': 'gijutsu',
    'Crime': 'hanzai'
  },
  'Chinese': {
    'General News': 'xinwen',
    'Economy': 'jingji',
    'Entertainment': 'yule',
    'Politics': 'zhengzhi',
    'Society': 'shehui',
    'Sport': 'tiyu',
    'Technology': 'keji',
    'Crime': 'fanzui'
  },
  'Korean': {
    'General News': 'nyuseu',
    'Economy': 'gyeongje',
    'Entertainment': 'yeonae',
    'Politics': 'jeongchi',
    'Society': 'sahoe',
    'Sport': 'seupocheu',
    'Technology': 'giseul',
    'Crime': 'beomjoe'
  },
  'Hindi': {
    'General News': 'samachar',
    'Economy': 'arthavyavastha',
    'Entertainment': 'manoranjan',
    'Politics': 'rajniti',
    'Society': 'samaj',
    'Sport': 'khel',
    'Technology': 'praudyogiki',
    'Crime': 'apradh'
  },
  'Turkish': {
    'General News': 'haberler',
    'Economy': 'ekonomi',
    'Entertainment': 'eglence',
    'Politics': 'siyaset',
    'Society': 'toplum',
    'Sport': 'spor',
    'Technology': 'teknoloji',
    'Crime': 'suc'
  },
  'Persian': {
    'General News': 'akhbar',
    'Economy': 'eqtesad',
    'Entertainment': 'sargarmi',
    'Politics': 'siyasat',
    'Society': 'jamee',
    'Sport': 'varzesh',
    'Technology': 'fanavari',
    'Crime': 'jorm'
  },
  'Hebrew': {
    'General News': 'chadashot',
    'Economy': 'kalkala',
    'Entertainment': 'bidyur',
    'Politics': 'politika',
    'Society': 'chevra',
    'Sport': 'sport',
    'Technology': 'tekhhnologiya',
    'Crime': 'pesha'
  },
  'Greek': {
    'General News': 'eidiseis',
    'Economy': 'oikonomia',
    'Entertainment': 'psychagogia',
    'Politics': 'politiki',
    'Society': 'koinonia',
    'Sport': 'athlitismos',
    'Technology': 'technologia',
    'Crime': 'eglima'
  },
  'Polish': {
    'General News': 'wiadomosci',
    'Economy': 'gospodarka',
    'Entertainment': 'rozrywka',
    'Politics': 'polityka',
    'Society': 'spoleczenstwo',
    'Sport': 'sport',
    'Technology': 'technologia',
    'Crime': 'przestepstwo'
  },
  'Ukrainian': {
    'General News': 'novyny',
    'Economy': 'ekonomika',
    'Entertainment': 'rozvahy',
    'Politics': 'polityka',
    'Society': 'suspilstvo',
    'Sport': 'sport',
    'Technology': 'tekhnologii',
    'Crime': 'zlochyn'
  }
};

export function getTopicSearchTerm(topic: Topic, language: string): string {
  const langTerms = topicSearchTerms[language];
  if (langTerms && langTerms[topic]) {
    return langTerms[topic];
  }
  return topicSearchTerms['English'][topic];
}

// Alias for backward compatibility
export const topics = availableTopics;
