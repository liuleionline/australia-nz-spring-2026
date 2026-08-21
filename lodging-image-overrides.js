(function () {
  "use strict";
  const hotelPhotos = {
    "sydney-ibis": {
      src: "https://images.meetingsbooker.com/images/venues/ibisstylessydneycentral-0.jpg",
      position: "center center"
    },
    "melbourne-hie": {
      src: "https://digital.ihg.com/is/image/ihg/holiday-inn-express-melbourne-7527478507-original",
      position: "center center"
    },
    "chc-airport": {
      src: "https://images.squarespace-cdn.com/content/v1/664bc984ad08e42274c915f3/1722312413760-BVX0FVZ8GNZDC90ZRYQF/Airport%2BGateway%2BMotel%2B-%2B812-2.jpg",
      position: "center center"
    },
    "tekapo": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-29215377/original/8666f318-f45a-4829-a584-5f33431d4090.jpeg?im_w=720",
      position: "center center"
    },
    "twizel": {
      src: "https://a0.muscache.com/im/pictures/ffd39269-1484-4c33-9f62-4908c22e19e9.jpg?auto=webp&im_w=720&quality=70&width=720",
      position: "center center"
    },
    "wanaka": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-638009211870028013/original/2efb3da2-c524-48bf-b145-63637d1fdcc2.jpeg?im_w=720",
      position: "center center"
    },
    "queenstown": {
      src: "https://a0.muscache.com/im/pictures/hosting/Hosting-1644535952191581825/original/4f9ab887-f434-4ff0-9ed5-b375c2298165.jpeg?im_w=720",
      position: "center center"
    },
    "teanau": {
      src: "https://a0.muscache.com/im/pictures/4b56660d-afa6-437f-b4b5-7aee9ad930cd.jpg?im_w=720",
      position: "center center"
    },
    "haast": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-1148248503776849185/original/a9f30e84-bba7-4e47-8744-af65a77fcfa7.jpeg?im_w=720",
      position: "center center"
    },
    "franz": {
      src: "https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6MTE5MjY0NjAwMjA1MDUzOTEyNQ%3D%3D/original/3eff3910-5729-4fef-8b86-d8697455a37a.jpeg?im_w=720",
      position: "center center"
    },
    "hokitika": {
      src: "https://cf.bstatic.com/xdata/images/hotel/max1024x768/692367339.jpg?k=9f010f56e662b8528494a9f9019e747cd95eb3c334104c4ea36a35c2871f5591&o=",
      position: "center center"
    },
    "castlehill": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-22409971/original/28246979-fc2f-4b03-b92f-dac87f8bb6c3.jpeg?im_w=720",
      position: "center center"
    },
    "chc-final": {
      src: "https://a0.muscache.com/im/pictures/miso/Hosting-1241368912811080729/original/a5e21437-b535-43de-8540-249ffbafba82.jpeg?im_w=720",
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
