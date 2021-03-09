# RÚV RSS API proxy

Proxy ofan á RSS strauma frá RÚV. Skaffar „REST“ vefþjónustum.

Möguleikar á að hægja á og/eða kasta villum af handahófi.

Notað í [verkefni 5 í vefforritun 2, árið 2021](https://github.com/vefforritun/vef2-2021-v5).

Keyrir á:
https://vef2-2021-ruv-rss-json-proxy.herokuapp.com/

## Form

Frá gefinni grunnslóð er hægt að nálgast yfirlit yfir alla strauma.
Grunn gögn eru í `feeds.json`.

Yfirlit strauma er hægt að nálgast með `GET /` og er á forminu:

```json
{
  "url": "full slóð á gagnagstraum með öllum gefnum breytum",
  "title": "titill gagnastraums",
  "children": [],
}
```

Þar sem `children` eru aðrir gagnastraumar sem innihalda hlutstraum, t.d.
`Stjórnmál` undir `Innlent`. Ef engir hlutstraumar eru skilgreindir er
`children` tóma fylkið (`[]`).

Straum er hægt að nálgast með `GET /:id` þar sem `:id` er gilt id á straum.
Annars er `404` skilað.

Straumur er á forminu:

```json
{
  "title": "titill gagnastraums",
  "age": 0,
  "items": [
    {
      "title": "titill fréttar",
      "link": "hlekkur á frétt á vef RÚV",
      "published": "dagsetning á ISO 8601 formi",
      "publisher": "útgáfu aðili",
      "body": "texti fréttar",
    }
  ]
}
```

`age` er aldur gagna í cache.

## Caching

Öll gögn eru geymd í cache í 60 mínútur. Aldur gagna er gefinn í
yfirliti undir `age` sem sekúndur.

## Hægagangur og villur

Hægt er að búa til gervi villur og seinagang. Ef `delay` eða `error` er sent í
querystring sem tala á bilinu `[0, 1]` er það mikill möguleiki á hægagangi á
bilinu `[750, 3000]` ms.

Ef `DELAY_PROBABILITY` eða `ERROR_PROBABILITY` er sett í `env` er það gildi
notað. Sjálfgefið (eða, í `.env.example` og á keyrsluþjóni) eru gildin:

```bash
DELAY_PROBABILITY=0.5
ERROR_PROBABILITY=0.1
```
