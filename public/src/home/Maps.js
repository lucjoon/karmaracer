(function() {
  "use strict";

  Karma.Maps = function() {

    function preferredDrawEngine() {
      return Karma.LocalStorage.get('drawEngine') === 'WEBGL' ? 'WEBGL' : 'CANVAS';
    }

    function mapHref(mapName) {
      var href = 'game.' + mapName;
      if (preferredDrawEngine() === 'WEBGL') {
        href += '?draw=WEBGL';
      }
      return href;
    }

    function registerMaps() {
      $('.mapLink').click(function(e) {
        if (!$('#playerNameForm')[0].checkValidity()) {
          $('#playerNameForm').find(':submit').click();
          e.preventDefault();
          return false;
        }
        Karma.LocalStorage.set('playerName', $('#playerName').val());
        Karma.LocalStorage.set('map', $(this).data('map'));
        return true;
      });
    }

    function addMaps(connection, maps) {
      var $ul = $('ul#maps');
      var $mode = $(
        '<div id="drawEngineChoice" style="margin:10px 0;text-align:center">' +
          '<label><input type="checkbox" id="preferWebGL"/> Play in 3D (WebGL)</label>' +
        '</div>'
      );
      $('#titleContainer').after($mode);
      $('#preferWebGL').prop('checked', preferredDrawEngine() === 'WEBGL');
      $('#preferWebGL').on('change', function() {
        Karma.LocalStorage.set('drawEngine', this.checked ? 'WEBGL' : 'CANVAS');
        $('a.mapLink').each(function() {
          var map = $(this).data('map');
          $(this).attr('href', mapHref(map));
        });
      });

      for (var i = 0; i < maps.length; i++) {
        var o = [];
        var m = maps[i];
        if (m === 'longmap') {
          continue;
        }
        o.push('<li id="map-', m, '">');
        o.push('<a class="mapLink" href="', mapHref(m), '" data-map="', m, '"><div class="box"><div class="name">', m, '</div><div class="miniMap"></div>');
        o.push('<div class="info"><div class="players"/></div>');
        o.push('</div></a>');
        o.push('</li>');

        var $li = $(o.join(''));
        $li.hide();
        $ul.append($li);
        $li.fadeIn(1000);
        new Karma.Minimap($li.find('a div.miniMap'), m, connection);
      }
      registerMaps();
    }

    return {
      addMaps: addMaps
    };
  }();

}());