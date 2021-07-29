# c19early+

[c19early.com](https://c19early.com) have provided evidence syntheses and meta
analyses for disease treatment throughout the Covid-19 pandemic.

This Unofficial Chrome extension is a personal project that may be of interest
to others. It provides additional ways of engaging with the data provided by
these sites.

## Sites enhanced

- [ivmmeta.com](https://ivmmeta.com)
- [vdmeta.com](https://vdmeta.com)
- [hcqmeta.com](https://hcqmeta.com)

## Features

### Custom Exclusions

![Ivermectin exclusion example](/docs/exclusions.gif?raw=true)

Think a study has too high a risk of bias? Not impressed by population studies?
Clicking on a study in a forest/bar plot will remove it from every analysis and
[estimates](#estimates) of the summary effects, confidence and heterogenicity
are re-calculated.

### Time Travel

![Vitamin D time travel example](/docs/time-travel.gif?raw=true)

How has the analysis changed over time as studies were published? How has
confidence in a treatment changed in the last 6 months? A timeline is added and
the user can re-play through [estimates](#estimates) of how what the current
analysis would have looked like after each publication was included.

## Caveats

All data is parsed from the c19early.com websites at page load. As this
extension has no connection to the publishing of the sites, any change to the
structure of the sites may break the extension. Components have been written to
fail gracefully rather than display bad data but this is not guaranteed.

<a name="estimates">Estmates</a> of summary effects, confidence and
heterogenicity calculated with the generic inverse variance method.

Any errors in data modified by this extension are my own.

[Report issues](https://github.com/stevoland/c19early-plus/issues). Please bear
in mind this is a personal project made in very limited free time
