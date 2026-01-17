(function () {
  if (!location.href.startsWith("https://m.sooplive.co.kr/statistics/a/watch")) {
    location.href = "https://m.sooplive.co.kr/statistics/a/watch/?szModule=UserLiveWatchTimeData&szMethod=watch";
    return;
  }

  const favorites = {};
  const fetchFavorites = async () => {
    const res = await fetch(
      "https://api.m.sooplive.co.kr/station/favorite/a/items",
      {
        method: "POST",
        credentials: "include",
      }
    );
    const result = await res.json();
    if (result.data?.groups?.[0]?.contents != null) {
      for (const s of result.data.groups[0].contents) {
        favorites[s.user_nick] = s.user_id;
      }
    }
  };
  const loadScript = (src, sri) =>
    new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.type = "text/javascript";
      if (sri) {
        s.crossOrigin = "anonymous";
        s.integrity = sri;
      }
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  const graph = document.getElementById("st__part-1__graph");
  if (graph == null) {
    return;
  }

  const container = document.createElement("div");
  container.style.textAlign = "center";
  const container1 = document.createElement("div");
  container1.id = "r1";
  const container2 = document.createElement("div");
  container2.id = "r2";
  graph.after(container, container1, container2);

  const originalSetGraphPart1 = setGraphPart1;
  setGraphPart1 = (szMethod, szModule, data) => {
    originalSetGraphPart1(szMethod, szModule, data);
    if (szModule.includes("Search")) {
      return;
    }

    const numberFormat = Intl.NumberFormat();
    const formatTime = (m) => `${numberFormat.format(Math.floor(m))}분`;
    const recap = data.data_stack
      .map((t) => [t.bj_nick, t.data.reduce((a, b) => a + b, 0) / 60])
      .sort((a, b) => {
        if (a[0] === "기타") {
          return 1;
        } else if (b[0] === "기타") {
          return -1;
        } else {
          return b[1] - a[1];
        }
      });
    const recapData = recap
      .slice(0, -1)
      .map((t) => ({ name: t[0], value: t[1] }));
    const options = {
      title: {
        text: null,
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        series: {
          colorByPoint: true,
        },
      },
      xAxis: {
        type: "category",
      },
      credits: {
        enabled: false,
      },
      tooltip: {
        pointFormatter: function () {
          const t = this.y || this.value;
          const h = Math.floor(t / 60);
          return `<b>${h}시간 ${Math.floor(t - 60 * h)}분</b><br/>`;
        },
      },
    };

    try {
      const w = 512;
      const color = d3.scaleOrdinal(d3.schemeSet3);
      const pack = d3.pack().size([w, w]).padding(5);
      const root = pack(
        d3.hierarchy({ children: recapData }).sum((d) => d.value)
      );

      const svg = d3
        .create("svg")
        .attr("viewBox", [0, 0, w, w])
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("width", "100%")
        .style("max-width", "800px")
        .style("height", "auto");
      const node = svg
        .append("g")
        .selectAll()
        .data(root.leaves())
        .join("g")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      node
        .append("title")
        .text((d) => `${d.data.name}\n${formatTime(d.value)}`);
      node
        .append("circle")
        .attr("fill", (d) => color(d.data.name))
        .attr("r", (d) => d.r);

      node
        .filter((d) => !!favorites[d.data.name])
        .append("image")
        .attr("href", (d) => {
          const id = favorites[d.data.name];
          return `https://stimg.sooplive.co.kr/LOGO/${id.slice(
            0,
            2
          )}/${id}/${id}.webp`;
        })
        .attr("x", (d) => -d.r)
        .attr("y", (d) => -d.r)
        .attr("width", (d) => d.r * 2)
        .attr("height", (d) => d.r * 2)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .attr("clip-path", (d) => `circle(${d.r})`);

      const text = node
        .append("text")
        .attr("clip-path", (d) => `circle(${d.r})`);
      text
        .filter((d) => !favorites[d.data.name])
        .append("tspan")
        .attr("x", 0)
        .attr("y", "0.35em")
        .text((d) => d.data.name);
      text
        .filter((d) => d.r > 40)
        .append("tspan")
        .attr("x", 0)
        .attr("y", (d) => d.r - 9)
        .text((d) => formatTime(d.value))
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .attr("paint-order", "stroke");

      container.replaceChildren(svg.node());
    } catch {}

    try {
      new Highcharts.Chart("r1", {
        ...options,
        chart: {
          height: 300,
        },
        series: [
          {
            type: "treemap",
            layoutAlgorithm: "squarified",
            data: recapData,
          },
        ],
      });
    } catch {}

    new Highcharts.Chart("r2", {
      ...options,
      chart: {
        height: Math.max(300, recap.length * 30),
      },
      yAxis: {
        opposite: true,
        title: {
          text: null,
        },
      },
      series: [
        {
          type: "bar",
          data: recap,
        },
      ],
    });
  };

  Promise.all([
    fetchFavorites(),
    loadScript(
      "https://static.sooplive.co.kr/asset/library/highcharts/js/modules/treemap.js"
    ),
    loadScript(
      "https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js",
      "sha256-8glLv2FBs1lyLE/kVOtsSw8OQswQzHr5IfwVj864ZTk="
    ),
  ]).then(() => {
    callWatchAjax(szMethod, szModule);
  });
})();
