$( document ).ready(function() {
  const DATA_COMPLETE = 'https://proxy.hxlstandard.org/data.csv?dest=data_edit&strip-headers=on&force=on&tagger-match-all=on&tagger-01-header=date&tagger-01-tag=%23date&tagger-02-header=iso3&tagger-02-tag=%23iso3&tagger-03-header=location&tagger-03-tag=%23location&tagger-04-header=subcategory&tagger-04-tag=%23subcategory&tagger-05-header=category&tagger-05-tag=%23category&tagger-06-header=status&tagger-06-tag=%23status&header-row=1&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1KJ4U6rc0ROWzpfHnaSlpRijF-t8T0Ze4Pq2sBjAqKrc%2Fedit%3Fpli%3D1%23gid%3D1171577919';
  const PCT_COMPLETE_SUBCATEGORY  = 'https://proxy.hxlstandard.org/data.csv?dest=data_edit&strip-headers=on&force=on&tagger-match-all=on&tagger-01-header=date&tagger-01-tag=%23date&tagger-02-header=subcategory&tagger-02-tag=%23subcategory&tagger-03-header=category&tagger-03-tag=%23category&tagger-04-header=percentage+data+complete&tagger-04-tag=%23per%2Bcomplete&tagger-05-header=percentage+data+incomplete&tagger-05-tag=%23per%2Bincomplete&tagger-06-header=percentage+no+data&tagger-06-tag=%23per%2Bnodata&header-row=1&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1KJ4U6rc0ROWzpfHnaSlpRijF-t8T0Ze4Pq2sBjAqKrc%2Fedit%3Fpli%3D1%23gid%3D1944345237';
  const PCT_COMPLETE_COUNTRY = 'https://proxy.hxlstandard.org/data.csv?dest=data_edit&strip-headers=on&force=on&tagger-match-all=on&tagger-01-header=date&tagger-01-tag=%23date&tagger-02-header=iso3&tagger-02-tag=%23iso&tagger-03-header=location&tagger-03-tag=%23location&tagger-04-header=percentage+data+complete&tagger-04-tag=%23pct%2Bcomplete&tagger-05-header=percentage+data+incomplete&tagger-05-tag=%23pct%2Bincomplete&tagger-06-header=percentage+no+data&tagger-06-tag=%23pct%2Bnodata&header-row=1&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1KJ4U6rc0ROWzpfHnaSlpRijF-t8T0Ze4Pq2sBjAqKrc%2Fedit%3Fpli%3D1%23gid%3D579688831';
  const pctFormat = d3.format('.0%');
  let columns, items = [];
  let iconMap, countryMap, sortOrder, tooltip;


  function getData() {
    Promise.all([
      d3.csv(DATA_COMPLETE),
      d3.csv(PCT_COMPLETE_SUBCATEGORY),
      d3.csv(PCT_COMPLETE_COUNTRY)
    ]).then(function(d) {
      console.log('Data loaded');
      let data = d[0];
      let pctSubcategoryData = d[1];
      let pctCountryData = d[2]

      // console.log(data)
      // console.log(pctSubcategoryData)
      // console.log(pctCountryData)

      //map icons to category
      iconMap = {
        'Affected People': 'humanitarianicons-Affected-population',
        'Coordination & Context': 'humanitarianicons-Coordination',
        'Food Security & Nutrition': 'humanitarianicons-Food-Security',
        'Geography & Infrastructure': 'humanitarianicons-Location',
        'Health & Education': 'humanitarianicons-Health',
        'Population & Socio-economic Indicators': 'humanitarianicons-People-in-need'
      };

      countryMap = d3.group(data, d => d['#location']);

      //define table column labels
      columns = Array.from(new Set(data.map(d => d['#location']))).sort();
      columns.unshift('subcategory');
      columns.push('percentComplete');

      //group data by category and then sort by subcategories
      const categories = d3.group(data, d=> d['#category']);
      let subcategoryOrder = [];
      categories.forEach(function(cat) {
        let subcats = Array.from(new Set(cat.map(d => d['#subcategory']))).sort();
        subcats.forEach(function(sc) {
          subcategoryOrder.push({category: cat[0]['#category'], subcategory: sc})
        });
      });

      //format data for table
      const subcategories = d3.group(data, d => d['#subcategory'], d => d['#location']);
      const pctComplete = d3.group(pctSubcategoryData, d=> d['#subcategory']);
      const pctCountryComplete = d3.group(pctCountryData, d=> d['#location']);
      let pctCountryValues = {subcategory: 'countryPctComplete', percentComplete: null};
      subcategoryOrder.forEach(function(sc) {
        let subcategory = subcategories.get(sc.subcategory);
        let pct = pctComplete.get(sc.subcategory);
        let item = {subcategory: sc.subcategory, percentComplete: pct[0]['#per+complete'], category: sc.category};
        columns.forEach(function(col) {
          let pctCountry = pctCountryComplete.get(col);
          if (pctCountry!==undefined) {
            pctCountryValues[col] = pctCountry[0]['#pct+complete'];
          }
          let arr = subcategory.get(col);
          if (arr!==undefined) {
            item[col] = arr[0]['#status'];
          }
        });
        items.push(item);
      });

      //items.sort((a, b) => (a.percentComplete < b.percentComplete) ? 1 : -1)
      items.push(pctCountryValues);
      console.log(items);

      createTable();
    });

    initDisplay();
  }

  function initDisplay() {
    $('#field-order-by').on('click', function() {
      $('.orderDropdown').addClass('open');
    });

    $(document).mouseup(function (e) {
      let sortBtn = $('#field-order-by');
      if (!sortBtn.is(e.target) && sortBtn.has(e.target).length === 0) {
        $('.orderDropdown').removeClass('open');
      }
    });

    $('.dropdown-menu a').on('click', function(e) {
      $('.dropdown-toggle-text').html($(this).html());
      if ($(this).attr('val')!==sortOrder) {
        sortOrder = $(this).attr('val')
        sortTable();
      }
    });
  }

  function sortTable() {
    let pctRow = items.pop(); //save last row of complete percentages before sorting
    items.sort(function(a, b) {
      let sorted = (sortOrder==='dsc') ? d3.descending(a.percentComplete, b.percentComplete) : d3.ascending(a.percentComplete, b.percentComplete);
      return sorted;
    });
    items.push(pctRow); //push complete pct row at the end so its always at the bottom

    const tbody = d3.select('tbody');
    tbody.selectAll("*").remove();
    buildRows();
  }


  function createTable() {
    tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    let table = d3.select('.table-container').append('table');
    let headers = table.append('thead').append('tr')
      .selectAll('th')
      .data(columns).enter()
      .append('th')
      .classed('rotate', d => d!=='subcategory' && d!=='percentComplete')
      .html(function (d) {
        let iso = (countryMap.get(d)!==undefined) ? (countryMap.get(d)[0]['#iso3']).toUpperCase() : '';
        return d==='subcategory'||d==='percentComplete' ? '' : `<div><img class="flag" src="https://data.humdata.org/visualization/datagrid/assets/flags/${iso}.png">${d}</div>`;
      });

    table.append('tbody');
    buildRows();
  }

    
  function buildRows() {
    let tbody = d3.select('tbody');
    let rows = tbody.selectAll('tr')
      .data(items).enter()
      .append('tr')     
        .attr('class', function (d) {
          return d.subcategory;
        });

    rows
        .style('opacity', 0)
        .transition()
        .duration(0)
        .delay(function(d, i) {
          return i*20
        })
        .style('opacity', 1);

    rows.selectAll('td')
      .data(function (d) {
        return columns.map(function (col) {
          let val = (d[col]===undefined) ? 'Empty' : d[col];
          let obj = { name: col, value: val };
          obj['category'] = (d.category===undefined) ? d.subcategory : d.category;
          if (d.subcategory!=='countryPctComplete') {
            obj['subcategory'] = d.subcategory;
          }
          return obj;
        });
      }).enter()
      .append('td')
      .attr('class', function (d) {
        if (d.value==='Not applicable') d.value = 'NA';
        let val = d.category==='countryPctComplete' ? d.value : 'completeness ' + d.value;
        return d.name==='subcategory' || d.name==='percentComplete' ? d.name : val;
      })
      .html(function (d) {
        let content = '';
        if (d.name==='subcategory') {
          content = '<div class="icon-container"><i class="'+iconMap[d.category]+'"></i></div>' + d.value; 
        }
        if (d.name==='percentComplete' || d.category==='countryPctComplete') {
          content = pctFormat(d.value); 
        }
        return content;
      })
      .on('mouseover', function(e, d) {
        //set row highlight
        if ($(e.target).hasClass('completeness')) {
          $(e.target).parent().addClass('active');
        }
        //set tooltip
        if (d.name==='subcategory' || d.name==='percentComplete' || d.category==='countryPctComplete') {
          let content = '';
          if (d.name==='subcategory')
            content = d.category;
          if (d.name==='percentComplete')
            content = 'Complete % of ' + d.subcategory;
          if (d.category==='countryPctComplete')
            content = 'Complete % of ' + d.name;

          tooltip.transition()
            .duration(200)
            .style('opacity', .9);
          tooltip.html(content)
            .style('left', ($(e.target).offset().left + $(e.target).width()/2 - $('.tooltip').width()/2) + 'px')
            .style('top', ($(e.target).offset().top - $('.tooltip').outerHeight()) + 'px');
        }
      })
      .on('mouseout', function(e, d) {
        $(e.target).parent().removeClass('active')
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
       });
  }

  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = '';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  //initTracking();
});