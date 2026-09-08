(function () {
  "use strict";
  const hotelPhotos = {
    "sydney-ibis": {
      src: "https://d2e5ushqwiltxm.cloudfront.net/wp-content/uploads/sites/294/2025/05/26031848/0314_Salter_Brothers_Mercure_Hotels_31stMay2023-Edit.jpg",
      position: "center center"
    },
    "melbourne-hie": {
      src: "https://digital.ihg.com/is/image/ihg/holiday-inn-express-melbourne-7527478507-original",
      position: "center center"
    },
    "chc-airport": {
      src: "https://static1.squarespace.com/static/664bc984ad08e42274c915f3/t/6a6a839f192fd02d2957eeaf/1785365407801/Airport+Gateway+Chrtistchurch.png?format=1500w",
      position: "center center"
    },
    "tekapo": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-1234979367439107795/original/b58f1836-331c-42a8-b9ce-62f0ce6e6e2a.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "twizel": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-26610263/original/987bd274-6747-45c1-a588-c53aba528050.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "wanaka": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-638009211870028013/original/2efb3da2-c524-48bf-b145-63637d1fdcc2.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "queenstown": {
      src: "https://a0.muscache.com/im/pictures/hosting/Hosting-1691172239380274952/original/961319fd-5565-483e-a25b-9a01aa114ebf.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "teanau": {
      src: "https://a0.muscache.com/im/pictures/hosting/Hosting-1328515587337095762/original/90f3c0dc-3a0f-4b1e-ad16-4cd27a3c5375.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "haast": {
      src: "https://a0.muscache.com/im/pictures/hosting/Hosting-1195345556254873961/original/09a37ca0-ba9f-4407-a4f3-3638c11cff12.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "franz": {
      src: "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTE5MjY0NjAwMjA1MDUzOTEyNQ%3D%3D/original/3eff3910-5729-4fef-8b86-d8697455a37a.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "hokitika": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-1431569775284311748/original/9e6a1140-1ab1-450d-9103-8af42d818d56.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "castlehill": {
      src: "https://a0.muscache.com/im/pictures/hosting/Hosting-1565659033496668162/original/618e1464-b111-401a-a876-ac743e2cd7a2.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    },
    "chc-final": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-1241368912811080729/original/a5e21437-b535-43de-8540-249ffbafba82.jpeg?im_w=720&width=720&quality=70&auto=webp",
      position: "center center"
    }
  };
  const hotels = window.TRIP_DATA && Array.isArray(window.TRIP_DATA.hotels) ? window.TRIP_DATA.hotels : [];
  hotels.forEach((hotel) => {
    const photo = hotelPhotos[hotel.id];
    if (photo) {
      hotel.image = photo.src;
      hotel.imagePosition = photo.position || "center center";
    }
  });
})();
