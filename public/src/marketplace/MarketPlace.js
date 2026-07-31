(function() {
  "use strict";
  /*global io */

  var MarketPlace = {};

  MarketPlace.start = function() {
    var connection = io.connect();
    Karma.TopBar.setTopBar(connection);

    new Karma.CarViewer(connection);

    Karma.Loading.remove();

  };

  Karma.MarketPlace = MarketPlace;


}());