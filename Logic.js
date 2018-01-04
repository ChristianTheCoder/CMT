var marketData = new Object;
$(function () {
    $("#msg").text("Loading Market Data from Cryptopia...");
    $.get('https://www.cryptopia.co.nz/api/GetTradePairs', function (data) {
        var mktData = data.Data;
        for (var i = 0; i < mktData.length; i++) {
            marketData[mktData[i].Label.toLowerCase()] = mktData[i];
        }
        $("#msg").html("&nbsp;");
        runArbitrage();
    })
        .fail(function () {
            $("#msg").text("Error in Loading Market Data from Cryptopia...");
            $("table").addClass("disabled");
    });
    // Helper function to convert a string of the form "Mar 15, 1987" into a Date object.
    var date_from_string = function (str) {
        var months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        var pattern = "^([a-zA-Z]{3})\\s*(\\d{1,2}),\\s*(\\d{4})$";
        var re = new RegExp(pattern);
        var DateParts = re.exec(str).slice(1);

        var Year = DateParts[2];
        var Month = $.inArray(DateParts[0].toLowerCase(), months);
        var Day = DateParts[1];

        return new Date(Year, Month, Day);
    }

    var table = $("table").stupidtable({
        "date": function (a, b) {
            // Get these into date objects for comparison.
            aDate = date_from_string(a);
            bDate = date_from_string(b);
            return aDate - bDate;
        }
    });

    table.on("beforetablesort", function (event, data) {
        // Apply a "disabled" look to the table while sorting.
        // Using addClass for "testing" as it takes slightly longer to render.
        $("#msg").text("Sorting...");
        $("table").addClass("disabled");
    });

    table.on("aftertablesort", function (event, data) {
        // Reset loading message.
        $("#msg").html("&nbsp;");
        $("table").removeClass("disabled");

        var th = $(this).find("th");
        th.find(".arrow").remove();
        var dir = $.fn.stupidtable.dir;

        var arrow = data.direction === dir.ASC ? "&uarr;" : "&darr;";
        th.eq(data.column).append('<span class="arrow">' + arrow + '</span>');
    });

});

function runArbitrage() {

    $("table").find("tr:not(:first)").remove();
    var ltcPrice;
    $("#msg").text("Comparing data from Cryptopia...");
    $.get('https://www.cryptopia.co.nz/api/GetMarkets', function (data) {
        var altPairs = new Object;
        var btcPairs = new Object;
        var tradePairs = data.Data;
        var newRowHTML = "";
        var comparisonArray = [];
        for (var i = 0; i < tradePairs.length; i++) {
            if (tradePairs[i].Label.toLowerCase().includes('/btc'))
                btcPairs[tradePairs[i].Label.toLowerCase().split('/')[0]] = tradePairs[i];
            else if (tradePairs[i].Label.toLowerCase().includes('/ltc'))
                altPairs[tradePairs[i].Label.toLowerCase().split('/')[0]] = tradePairs[i];
        }
        ltcPrice = btcPairs['ltc'].BidPrice;
        usdToBtc = btcPairs['$$$'].BidPrice;
        Object.keys(altPairs).forEach(function (key, index) {
            var altObject = this[key];
            if (key in btcPairs){
                var btcObject = btcPairs[key];
                var altMarketData = marketData[altObject.Label.toLowerCase()];
                var btcMarketData = marketData[btcObject.Label.toLowerCase()];
                var comparison = {
                    Symbol: btcMarketData.Symbol,
                    Name: btcMarketData.Currency,
                    BtcAskPrice: btcObject.AskPrice,
                    BtcAskPriceUSD: btcObject.AskPrice/usdToBtc,
                    AltBidPrice: altObject.BidPrice,
                    AltBidPriceBTC: altObject.BidPrice * ltcPrice,
                    AltBidPriceUSD: (altObject.BidPrice * ltcPrice) / usdToBtc,
                    ConvertedAltPrice: altObject.AskPrice * ltcPrice,
                    Discrepancy: (altObject.BidPrice * ltcPrice) - btcObject.AskPrice,
                    DiscrepancyUSD: ((altObject.BidPrice * ltcPrice) - btcObject.AskPrice) / usdToBtc,
                    BtcSellVolume: btcObject.SellVolume,
                    AltBuyVolume: altObject.BuyVolume,
                    BtcPairId: btcObject.TradePairId,
                    AltPairId: altObject.TradePairId,
                    BTCStatus: btcMarketData.Status,
                    AltStatus: altMarketData.Status,
                    BtcTradeFee: btcMarketData.TradeFee,
                    AltTradeFee: altMarketData.TradeFee
                }
                comparisonArray.push(comparison);
                newRowHTML += '<tr><td class="name">' + comparison.Symbol + '</td>';
                newRowHTML += '<td> <a href=https://coinmarketcap.com/currencies/' + comparison.Name.replace(' ','-') + '>' + comparison.Name + '</a></td>';
                newRowHTML += '<td> <a href=https://www.cryptopia.co.nz/Exchange?market=' + btcObject.Label.replace('/', '_') + '>' + btcObject.Label + '</a></td>';
                newRowHTML += '<td> <a href=https://www.cryptopia.co.nz/Exchange?market=' + altObject.Label.replace('/', '_') + '>' + altObject.Label + '</a></td>';
                newRowHTML += '<td ' + (comparison.Discrepancy > 0 ? "class=positive" : "class=negative") + '>' + comparison.Discrepancy + '</td>';
                newRowHTML += '<td ' + (comparison.DiscrepancyUSD > 0 ? "class=positive" : "class=negative") + '>' + comparison.DiscrepancyUSD + '</td>';
                newRowHTML += '<td>' + comparison.BtcAskPrice + '</td>';
                newRowHTML += '<td>' + comparison.AltBidPriceBTC + '</td>';
                newRowHTML += '<td>' + comparison.BtcAskPriceUSD + '</td>';
                newRowHTML += '<td>' + comparison.AltBidPriceUSD + '</td>';
                newRowHTML += '<td>' + comparison.AltBidPrice + '</td>';
                newRowHTML += '<td>' + comparison.BtcSellVolume + '</td>';
                newRowHTML += '<td>' + comparison.AltBuyVolume + '</td>';
                newRowHTML += '<td>' + comparison.BtcTradeFee + '</td>';
                newRowHTML += '<td>' + comparison.AltTradeFee + '</td>';
                newRowHTML += '<td ' + (comparison.BTCStatus == 'OK' ? "class=positive" : "class=negative")+'>' + comparison.BTCStatus + '</td>';
                newRowHTML += '<td ' + (comparison.AltStatus == 'OK' ? "class=positive" : "class=negative")+'>' + comparison.AltStatus + '</td></tr>';
            }
        }, altPairs);
        $("table").append(newRowHTML);

        var $table = $("table").stupidtable();
        var $th_to_sort = $table.find("thead th").eq(4);
        $th_to_sort.stupidsort('desc');

        $("#msg").html("&nbsp;");
    }).fail(function () {
        alert("Error in getting Trade Data from Cryptopia");
        return;
    });
}