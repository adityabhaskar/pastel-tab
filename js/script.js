var lightness = "95%";
var saturation = "100%";
var clockTimeout;
var hourFormat = TWENTY_FOUR_HOUR_FORMAT;

$(document).ready(() => {
  
  // If pinned colour, set that as background color
  setPinnedColour(localStorage.pinnedColour);
  
  ls.get({
    "twentyfourhourclock": DEFAULT_TWENTY_FOUR_HOUR_CLOCK,
    "showClock": DEFAULT_SHOW_CLOCK,
    "showTopSites": DEFAULT_SHOW_TOP_SITES,
    "topSitesPermission_firstAsk": false
  }, st => {
    
    // Set clock format
    setClockFormat(st.twentyfourhourclock);
    
    // Show/hide clock
    showClock(st.showClock);
    
    // Show top sites
    if(!st.topSitesPermission_firstAsk)
      $("#top_sites_link").addClass("grab_attention");
    else
      showTopSites(st.showTopSites);
  });
  
  
  // Open options page
  $("#settings_link").on("click", () => chrome.runtime.openOptionsPage());
  
  
  // Toggle site visibility in storage
  $("#top_sites_link").on("click", () => {
    
    ls.set({"topSitesPermission_firstAsk": true});
    $("#top_sites_link").removeClass("grab_attention");
    
    ls.get({showTopSites: DEFAULT_SHOW_TOP_SITES}, st => {
      
      let newShowTopSites = !st.showTopSites;
      
      // If changing from false to true, check if we have permission
      if(!st.showTopSites) {
        chrome.permissions.contains({
          permissions: ["topSites"]
        }, result => {
          
          // The extension has the permissions.
          // Save setting as true, action will happen in storage change handler
          if(result)
            ls.set({showTopSites: newShowTopSites});
          
          
          else {
            // The extension doesn't have the permissions.
            // Request permission. 
            chrome.permissions.request({
              permissions: ["topSites"]
            }, granted => {
              
              // If granted, set setting as true, 
              if (granted)
                ls.set({showTopSites: newShowTopSites});
              
              // If not granted, do nothing (or show modal)
              else {
                console.warn("Permission not granted");
              }
              
            });
          }
        });
      }
      
      // Setting it off, so just save the new setting
      else
        ls.set({showTopSites: newShowTopSites});
    });
  });
  
  
  // Toggle clock visibility in storage
  $("#clock_link").on("click", () =>
    ls.get({showClock: DEFAULT_SHOW_CLOCK}, st =>
      ls.set({showClock: !st.showClock})
    )
  );
  
  
  // Toggle clock type in storage
  $("#hr_link").on("click", () =>
    ls.get({twentyfourhourclock: DEFAULT_TWENTY_FOUR_HOUR_CLOCK}, st =>
      ls.set({twentyfourhourclock: !st.twentyfourhourclock})
    )
  );
  
  
  // Save pinned colour to storage.
  // Actual pinning happens in storage.onchanged handler
  $("#pin_colour_link").on("click", () => 
    
    ls.get({pinnedColour: DEFAULT_PINNED_COLOUR}, st => {
      
      if(!!st.pinnedColour){
        
        ls.remove("pinnedColour");
        localStorage.removeItem("pinnedColour");
        
      } else {
        
        let bgcolor = $("body").css("background-color");
        ls.set({pinnedColour: bgcolor});
        localStorage.pinnedColour = bgcolor;
        
      }
    })
  );
  
  
  chrome.storage.onChanged.addListener((changes, area) => {
    
    if(changes.twentyfourhourclock)
      setClockFormat(changes.twentyfourhourclock.newValue);
    
    if(changes.showClock)
      showClock(changes.showClock.newValue);
    
    if(changes.showTopSites)
      showTopSites(changes.showTopSites.newValue);
    
    if(changes.pinnedColour)
      setPinnedColour(localStorage.pinnedColour);
  });
});


function showClock(show){
  
  if(clockTimeout)
    clearTimeout(clockTimeout);
  
  if(show){
    $("#clock, #hr_link").show();
    clock();
  }
  else
    $("#clock, #hr_link").hide();
}


function setClockFormat(isTwentyFourHour){
  
  if(isTwentyFourHour){
    hourFormat = TWENTY_FOUR_HOUR_FORMAT;
    $("#ic_clock_type").addClass("twelve");
  }
  else {
    hourFormat = TWELVE_HOUR_FORMAT;
    $("#ic_clock_type").removeClass("twelve");
  }
  
  if(clockTimeout)
    clearTimeout(clockTimeout);
  
  clock();
}


function showTopSites(show){
  
  if(show) {
    
    // Fetch top sites from API, and show
    chrome.topSites.get(topSites => {
      let err = chrome.runtime.lastError;
      if(err){
        console.warn("Error: ", err);
        return;
      }
      
      topSites = topSites
        .filter(site => !/^chrome(\-extension)?\:\/\//.test(site.url));
      
      topSites
        .slice(0, Math.min(topSites.length, 8))
        .forEach(site => {
          $("#topSites").append(`<li class="top_site_item"><a href="${site.url}" class="top_site_link">${site.title}</a></li>`);
          console.log(site);
        });
      
      $("#topSites").fadeIn("fast");
      $("#top_sites_link").addClass("showing");
      
    });
    
  }
  
  else {
    
    $("#topSites").text("").fadeOut("fast");
    $("#top_sites_link").removeClass("showing");
    
  }
}


function setPinnedColour(colour){
  if(!!colour){
    $("body").css("background-color", colour); //set color
    $("#pin_colour_link").addClass("pinned");
  } else {
    changeColor();
    $("#pin_colour_link").removeClass("pinned");
  }
}


function clock() {
  $("#clock").html(moment().format(hourFormat));
  clockTimeout = setTimeout(function() { clock(); }, 500);
}


function changeColor(){
  let col = parseInt((Date.now()%1000)*360/1000)
  // let col = parseInt(Math.random() * 360); //randomize color
  
  let colorString = "hsl(" + col + ", " + saturation + ", " + lightness + ")";
  $("body").css("background-color", colorString); //set color
  
  let hex = "#" + tinycolor(colorString).toHex(); //translate to hex
  console.log("changeColor", hex, colorString);
}


function removeTopSitesPermission(callback){
  chrome.permissions.remove({
    permissions: ["topSites"]
  }, callback);
}
